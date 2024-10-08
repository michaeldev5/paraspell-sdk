import type { Signer } from 'ethers'
import type { TNodePolkadotKusama } from './TNode'

export type TEvmBuilderOptions = {
  to: TNodePolkadotKusama
  amount: string
  currency: string
  address: string
  signer: Signer
}

export type TSerializeEthTransferOptions = Omit<TEvmBuilderOptions, 'signer'> & {
  destAddress: string
}

export type TSerializedEthTransfer = {
  token: string
  destinationParaId: number
  destinationFee: bigint
  amount: bigint
}

type OptionalProperties<T> = {
  [P in keyof T]?: T[P] | undefined
}

export type TOptionalEvmBuilderOptions = OptionalProperties<TEvmBuilderOptions>

export enum BatchMode {
  BATCH_ALL = 'BATCH_ALL',
  BATCH = 'BATCH'
}

export type TBatchOptions = {
  mode: BatchMode
}
