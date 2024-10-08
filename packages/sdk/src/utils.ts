// Contains important call creation utils (Selection of fees,formating of header and more.. )

import { ApiPromise, WsProvider } from '@polkadot/api'
import { ethers } from 'ethers'
import { prodRelayPolkadot, prodRelayKusama } from '@polkadot/apps-config/endpoints'
import {
  type TNode,
  type TPallet,
  type TScenario,
  type TSerializedApiCall,
  Version,
  type Extrinsic,
  type TNodeWithRelayChains,
  type TAddress,
  type TMultiLocationHeader,
  Parents,
  type TJunction,
  type Junctions,
  TNodePolkadotKusama,
  TNodeDotKsmWithRelayChains
} from './types'
import { nodes } from './maps/consts'
import { type HexString } from '@polkadot/util/types'
import { getRelayChainSymbol } from './pallets/assets'

export const createAccID = (api: ApiPromise, account: string): HexString => {
  console.log('Generating AccountId32 address')
  return api.createType('AccountId32', account).toHex()
}

export const getFees = (scenario: TScenario): number => {
  if (scenario === 'ParaToRelay') {
    console.log('Asigning fees for transfer to Relay chain')
    return 4600000000
  } else if (scenario === 'ParaToPara') {
    console.log('Asigning fees for transfer to another Parachain chain')
    return 399600000000
  }
  throw new Error(`Fees for scenario ${scenario} are not defined.`)
}

export const generateAddressMultiLocationV4 = (
  api: ApiPromise,
  address: TAddress
): TMultiLocationHeader => {
  const isMultiLocation = typeof address === 'object'
  if (isMultiLocation) {
    return { [Version.V4]: address }
  }

  const isEthAddress = ethers.isAddress(address)
  return {
    [Version.V4]: {
      parents: Parents.ZERO,
      interior: {
        X1: [
          isEthAddress
            ? { AccountKey20: { key: address } }
            : { AccountId32: { id: createAccID(api, address), network: null } }
        ]
      }
    }
  }
}

export const createX1Payload = (version: Version, junction: TJunction): Junctions => {
  if (version === Version.V4) {
    return { X1: [junction] }
  }
  return { X1: junction }
}

export const generateAddressPayload = (
  api: ApiPromise,
  scenario: TScenario,
  pallet: TPallet | null,
  recipientAddress: TAddress,
  version: Version,
  nodeId: number | undefined
): TMultiLocationHeader => {
  const isMultiLocation = typeof recipientAddress === 'object'
  if (isMultiLocation) {
    return { [version]: recipientAddress }
  }

  const isEthAddress = ethers.isAddress(recipientAddress)

  if (scenario === 'ParaToRelay') {
    return {
      [version]: {
        parents: pallet === 'XTokens' ? Parents.ONE : Parents.ZERO,
        interior: createX1Payload(version, {
          AccountId32: {
            ...(version === Version.V1 && { network: 'any' }),
            id: createAccID(api, recipientAddress)
          }
        })
      }
    }
  }

  if (scenario === 'ParaToPara' && pallet === 'XTokens') {
    return {
      [version]: {
        parents: Parents.ONE,
        interior: {
          X2: [
            {
              Parachain: nodeId
            },
            isEthAddress
              ? {
                  AccountKey20: {
                    ...(version === Version.V1 && { network: 'any' }),
                    key: recipientAddress
                  }
                }
              : {
                  AccountId32: {
                    ...(version === Version.V1 && { network: 'any' }),
                    id: createAccID(api, recipientAddress)
                  }
                }
          ]
        }
      }
    }
  }

  if (scenario === 'ParaToPara' && pallet === 'PolkadotXcm') {
    return {
      [version]: {
        parents: Parents.ZERO,
        interior: createX1Payload(
          version,
          isEthAddress
            ? {
                AccountKey20: {
                  ...(version === Version.V1 && { network: 'any' }),
                  key: recipientAddress
                }
              }
            : {
                AccountId32: {
                  ...(version === Version.V1 && { network: 'any' }),
                  id: createAccID(api, recipientAddress)
                }
              }
        )
      }
    }
  }

  return {
    [version]: {
      parents: Parents.ZERO,
      interior: createX1Payload(
        version,
        isEthAddress
          ? { AccountKey20: { key: recipientAddress } }
          : { AccountId32: { id: createAccID(api, recipientAddress) } }
      )
    }
  }
}

export const getNode = <T extends TNode>(node: T): (typeof nodes)[T] => nodes[node]

export const getNodeEndpointOption = (node: TNodePolkadotKusama) => {
  const { type, name } = getNode(node)
  const { linked } = type === 'polkadot' ? prodRelayPolkadot : prodRelayKusama

  if (linked === undefined) return undefined

  const preferredOption = linked.find(o => o.info === name && Object.values(o.providers).length > 0)

  return preferredOption ?? linked.find(o => o.info === name)
}

export const getAllNodeProviders = (node: TNodePolkadotKusama): string[] => {
  const { providers } = getNodeEndpointOption(node) ?? {}
  if (providers && Object.values(providers).length < 1) {
    throw new Error(`Node ${node} does not have any providers.`)
  }
  return Object.values(providers ?? [])
}

export const getNodeProvider = (node: TNodeWithRelayChains): string => {
  if (node === 'Polkadot') {
    return prodRelayPolkadot.providers[0]
  } else if (node === 'Kusama') {
    return prodRelayKusama.providers[0]
  }
  return getNode(node).getProvider()
}

export const createApiInstance = async (wsUrl: string): Promise<ApiPromise> => {
  const wsProvider = new WsProvider(wsUrl)
  return await ApiPromise.create({ provider: wsProvider })
}

export const createApiInstanceForNode = async (node: TNodeWithRelayChains): Promise<ApiPromise> => {
  if (node === 'Polkadot' || node === 'Kusama') {
    const endpointOption = node === 'Polkadot' ? prodRelayPolkadot : prodRelayKusama
    const wsUrl = Object.values(endpointOption.providers)[0]
    return await createApiInstance(wsUrl)
  }
  return await getNode(node).createApiInstance()
}

export const lowercaseFirstLetter = (str: string): string =>
  str.charAt(0).toLowerCase() + str.slice(1)

export const callPolkadotJsTxFunction = (
  api: ApiPromise,
  { module, section, parameters }: TSerializedApiCall
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
): Extrinsic => api.tx[module][section](...parameters)

export const determineRelayChain = (node: TNodeWithRelayChains): TNodeDotKsmWithRelayChains =>
  getRelayChainSymbol(node) === 'KSM' ? 'Kusama' : 'Polkadot'

export const determineRelayChainSymbol = (node: TNodeWithRelayChains): string => {
  if (node === 'Polkadot') {
    return 'DOT'
  } else if (node === 'Kusama') {
    return 'KSM'
  } else {
    return getRelayChainSymbol(node)
  }
}

export const isRelayChain = (node: TNodeWithRelayChains): boolean =>
  node === 'Polkadot' || node === 'Kusama'
