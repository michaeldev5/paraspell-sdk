// Implements general builder pattern, this is Builder main file

import { type ApiPromise } from '@polkadot/api'
import {
  type TAmount,
  type Extrinsic,
  type TNode,
  type TSerializedApiCall,
  type TCurrencyInput,
  type TDestination,
  type TAddress,
  type TCurrency,
  type TMultiAsset,
  type TNodeWithRelayChains,
  type TVersionClaimAssets,
  type Version,
  TBatchOptions
} from '../../types'
import { CloseChannelBuilder, type InboundCloseChannelBuilder } from './CloseChannelBuilder'
import { OpenChannelBuilder, type MaxSizeOpenChannelBuilder } from './OpenChannelBuilder'
import RelayToParaBuilder from './RelayToParaBuilder'
import ParaToParaBuilder from './ParaToParaBuilder'
import ParaToRelayBuilder from './ParaToRelayBuilder'
import { MissingApiPromiseError } from '../../errors/MissingApiPromiseError'
import AssetClaimBuilder from './AssetClaimBuilder'
import BatchTransactionManager from './BatchTransactionManager'
import { IAddToBatchBuilder } from './IBatchBuilder'

class ToGeneralBuilder {
  private readonly api?: ApiPromise
  private readonly from: TNode
  private readonly to: TDestination
  private readonly paraIdTo?: number

  constructor(
    api: ApiPromise | undefined,
    from: TNode,
    to: TDestination,
    private batchManager: BatchTransactionManager,
    paraIdTo?: number
  ) {
    this.api = api
    this.from = from
    this.to = to
    this.paraIdTo = paraIdTo
  }

  currency(currency: TCurrencyInput): AmountOrFeeAssetBuilder {
    return ParaToParaBuilder.createParaToPara(
      this.api,
      this.from,
      this.to,
      currency,
      this.batchManager,
      this.paraIdTo
    )
  }

  openChannel(): MaxSizeOpenChannelBuilder {
    if (this.api === undefined) {
      throw new MissingApiPromiseError()
    }
    return OpenChannelBuilder.create(this.api, this.from, this.to)
  }
}

class FromGeneralBuilder {
  private readonly api?: ApiPromise
  private readonly from: TNode

  private _feeAsset?: TCurrency

  constructor(
    api: ApiPromise | undefined,
    from: TNode,
    private batchManager: BatchTransactionManager
  ) {
    this.api = api
    this.from = from
  }

  to(node: TDestination, paraIdTo?: number): ToGeneralBuilder {
    return new ToGeneralBuilder(this.api, this.from, node, this.batchManager, paraIdTo)
  }

  feeAsset(feeAsset: TCurrency): AmountBuilder {
    this._feeAsset = feeAsset
    return this
  }

  amount(amount: TAmount | null): AddressBuilder {
    return ParaToRelayBuilder.create(this.api, this.from, amount, this.batchManager, this._feeAsset)
  }

  closeChannel(): InboundCloseChannelBuilder {
    if (this.api === undefined) {
      throw new MissingApiPromiseError()
    }
    return CloseChannelBuilder.create(this.api, this.from)
  }
}

export class GeneralBuilder {
  constructor(
    private readonly batchManager: BatchTransactionManager,
    private readonly api?: ApiPromise,
    private readonly _from?: TNode,
    private readonly _to?: TDestination
  ) {}

  from(node: TNode): FromGeneralBuilder {
    return new FromGeneralBuilder(this.api, node, this.batchManager)
  }

  to(node: TDestination, paraIdTo?: number): AmountBuilder {
    return RelayToParaBuilder.create(this.api, node, this.batchManager, paraIdTo)
  }

  claimFrom(node: TNodeWithRelayChains): FungibleBuilder {
    return AssetClaimBuilder.create(this.api, node)
  }

  async buildBatch(options?: TBatchOptions) {
    return this.batchManager.buildBatch(this.api, this._from, this._to, options)
  }
}

export const Builder = (api?: ApiPromise): GeneralBuilder => {
  return new GeneralBuilder(new BatchTransactionManager(), api)
}

export interface FinalBuilder {
  build: () => Extrinsic | never
  buildSerializedApiCall: () => TSerializedApiCall
}

export interface FinalBuilderAsync {
  build: () => Promise<Extrinsic>
  buildSerializedApiCall: () => Promise<TSerializedApiCall>
}

export interface UseKeepAliveFinalBuilder extends IAddToBatchBuilder {
  useKeepAlive: (destApi: ApiPromise) => this
  xcmVersion: (version: Version) => this
  build: () => Promise<Extrinsic>
  buildSerializedApiCall: () => Promise<TSerializedApiCall>
}

export interface AddressBuilder {
  address: (address: TAddress) => UseKeepAliveFinalBuilder
}

export interface AmountBuilder {
  amount: (amount: TAmount | null) => AddressBuilder
}

export interface AmountOrFeeAssetBuilder {
  amount: (amount: TAmount | null) => AddressBuilder
  feeAsset: (feeAsset: TCurrencyInput) => AmountBuilder
}

export interface FungibleBuilder {
  fungible: (multiAssets: TMultiAsset[]) => AccountBuilder
}

export interface AccountBuilder {
  account: (address: TAddress) => VersionBuilder
}

export interface VersionBuilder extends FinalBuilderAsync {
  xcmVersion: (version: TVersionClaimAssets) => FinalBuilderAsync
}
