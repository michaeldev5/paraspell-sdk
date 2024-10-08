/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
// Unit tests for buildTransferExtrinsics function

import { describe, it, expect, vi, type MockInstance, beforeEach, afterEach } from 'vitest';
import * as utils from '../utils/utils';
import * as transferUtils from './utils';
import * as dexNodeFactory from '../dexNodes/DexNodeFactory';
import * as selectBestExchange from './selectBestExchange';
import { buildTransferExtrinsics } from './buildTransferExtrinsics';
import { MOCK_TRANSFER_OPTIONS } from '../utils/utils.test';
import { TBuildTransferExtrinsicsOptions, TransactionType } from '../types';
import type ExchangeNode from '../dexNodes/DexNode';
import { buildEthTransferOptions, createApiInstanceForNode } from '@paraspell/sdk';
import { ApiPromise } from '@polkadot/api';

vi.mock('@paraspell/sdk', async () => {
  const actual = await vi.importActual('@paraspell/sdk');
  return {
    ...actual,
    createApiInstanceForNode: vi.fn().mockResolvedValue({
      disconnect: () => {},
    }),
    buildEthTransferOptions: vi.fn(),
  };
});

describe('buildTransferExtrinsics', () => {
  let fromExchangeTxSpy: MockInstance,
    toExchangeTxSpy: MockInstance,
    feeSpy: MockInstance,
    validateSpy: MockInstance;

  beforeEach(() => {
    fromExchangeTxSpy = vi
      .spyOn(transferUtils, 'buildFromExchangeExtrinsic')
      .mockReturnValue({} as any);
    toExchangeTxSpy = vi
      .spyOn(transferUtils, 'buildToExchangeExtrinsic')
      .mockReturnValue({} as any);

    feeSpy = vi.spyOn(utils, 'calculateTransactionFee').mockReturnValue({} as any);
    validateSpy = vi.spyOn(utils, 'validateRelayChainCurrency').mockReturnValue({} as any);
    vi.spyOn(dexNodeFactory, 'default').mockReturnValue({
      node: 'Acala',
      createApiInstance: vi.fn().mockResolvedValue({
        disconnect: () => {},
      }),
      swapCurrency: vi.fn().mockResolvedValue({}),
    } as unknown as ExchangeNode);

    vi.mocked(buildEthTransferOptions).mockResolvedValue({
      token: 'token123',
      destinationParaId: 1000,
      destinationFee: BigInt(500),
      amount: BigInt(1000),
    });

    vi.mocked(createApiInstanceForNode).mockResolvedValue({
      disconnect: async () => {},
    } as ApiPromise);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should build transfer extrinsics correctly - manual exchange selection', async () => {
    const options: TBuildTransferExtrinsicsOptions = {
      ...MOCK_TRANSFER_OPTIONS,
      exchange: 'AcalaDex',
    };
    const result = await buildTransferExtrinsics(options);

    expect(result).toBeDefined();
    expect(result).toHaveLength(3);
    expect(createApiInstanceForNode).toHaveBeenCalled();
    expect(validateSpy).toHaveBeenCalledTimes(2);
    expect(feeSpy).toHaveBeenCalledTimes(2);
    expect(fromExchangeTxSpy).toHaveBeenCalledTimes(2);
    expect(toExchangeTxSpy).toHaveBeenCalled();
  });

  it('should build transfer extrinsics correctly - manual exchange selection - To Ethereum', async () => {
    const options: TBuildTransferExtrinsicsOptions = {
      ...MOCK_TRANSFER_OPTIONS,
      exchange: 'AcalaDex',
      assetHubAddress: '14Ghg2yZAxxNhiDF97iYrgk7CwRErEmQR4UpuXaa7JXpVKig',
      to: 'Ethereum',
    };
    const result = await buildTransferExtrinsics(options);

    expect(result).toBeDefined();
    expect(result).toHaveLength(4);
    expect(createApiInstanceForNode).toHaveBeenCalled();
    expect(validateSpy).toHaveBeenCalledTimes(2);
    expect(feeSpy).toHaveBeenCalledTimes(2);
    expect(fromExchangeTxSpy).toHaveBeenCalledTimes(3);
    expect(toExchangeTxSpy).toHaveBeenCalled();
  });

  it('should build transfer extrinsics correctly - auto exchange selection', async () => {
    const options = { ...MOCK_TRANSFER_OPTIONS, exchange: undefined };
    const selectBestExchangeSpy = vi
      .spyOn(selectBestExchange, 'selectBestExchange')
      .mockReturnValue(
        Promise.resolve({
          node: 'Acala',
          createApiInstance: vi.fn().mockResolvedValue({
            disconnect: () => {},
          }),
          swapCurrency: vi.fn().mockResolvedValue({}),
        } as unknown as ExchangeNode),
      );

    const result = await buildTransferExtrinsics(options);

    expect(result).toBeDefined();
    expect(result).toHaveLength(3);
    expect(createApiInstanceForNode).toHaveBeenCalled();
    expect(validateSpy).toHaveBeenCalledTimes(2);
    expect(selectBestExchangeSpy).toHaveBeenCalledTimes(1);
    expect(feeSpy).toHaveBeenCalledTimes(2);
    expect(fromExchangeTxSpy).toHaveBeenCalledTimes(2);
    expect(toExchangeTxSpy).toHaveBeenCalled();
  });

  it('throws error for invalid EVM injector Ethereum address', async () => {
    const options: TBuildTransferExtrinsicsOptions = {
      ...MOCK_TRANSFER_OPTIONS,
      exchange: 'AcalaDex',
      evmInjectorAddress: 'invalid_eth_address',
    };
    await expect(buildTransferExtrinsics(options)).rejects.toThrow(
      'Evm injector address is not a valid Ethereum address',
    );
  });

  it('throws error when Injector address is an Ethereum address', async () => {
    const options: TBuildTransferExtrinsicsOptions = {
      ...MOCK_TRANSFER_OPTIONS,
      exchange: 'AcalaDex',
      injectorAddress: '0x1501C1413e4178c38567Ada8945A80351F7B8496',
    };
    await expect(buildTransferExtrinsics(options)).rejects.toThrow(
      'Injector address cannot be an Ethereum address. Please use an Evm injector address instead.',
    );
  });

  it('throws error when AssetHub address is required but not provided', async () => {
    const options: TBuildTransferExtrinsicsOptions = {
      ...MOCK_TRANSFER_OPTIONS,
      exchange: 'AcalaDex',
      to: 'Ethereum',
      assetHubAddress: undefined,
    };
    await expect(buildTransferExtrinsics(options)).rejects.toThrow(
      'AssetHub address is required when transferring to or from Ethereum',
    );
  });

  it('throws error when Ethereum address is required but not provided', async () => {
    const options: TBuildTransferExtrinsicsOptions = {
      ...MOCK_TRANSFER_OPTIONS,
      from: 'Ethereum',
      exchange: 'AcalaDex',
      ethAddress: undefined,
      assetHubAddress: '14Ghg2yZAxxNhiDF97iYrgk7CwRErEmQR4UpuXaa7JXpVKig',
    };
    await expect(buildTransferExtrinsics(options)).rejects.toThrow(
      'Ethereum address is required when transferring from Ethereum',
    );
  });

  it('correctly processes transactions based on the specified transaction type', async () => {
    const options: TBuildTransferExtrinsicsOptions = {
      ...MOCK_TRANSFER_OPTIONS,
      exchange: 'AcalaDex',
      type: TransactionType.TO_EXCHANGE,
    };
    const result = await buildTransferExtrinsics(options);
    // Adjust expectations based on mocked responses and expected behavior
    expect(result.length).toBeLessThanOrEqual(1);
  });

  it('handles API instance creation failures gracefully', async () => {
    vi.mocked(createApiInstanceForNode).mockRejectedValue(
      new Error('Failed to create API instance'),
    );
    const options: TBuildTransferExtrinsicsOptions = {
      ...MOCK_TRANSFER_OPTIONS,
      exchange: 'AcalaDex',
    };
    await expect(buildTransferExtrinsics(options)).rejects.toThrow('Failed to create API instance');
  });

  it('handles FROM_ETH transaction type correctly', async () => {
    const options: TBuildTransferExtrinsicsOptions = {
      ...MOCK_TRANSFER_OPTIONS,
      exchange: 'AcalaDex',
      from: 'Ethereum',
      currencyFrom: 'WETH',
      type: TransactionType.FROM_ETH,
      assetHubAddress: '14Ghg2yZAxxNhiDF97iYrgk7CwRErEmQR4UpuXaa7JXpVKig',
      ethAddress: '0x1234567890123456789012345678901234567890',
    };
    const result = await buildTransferExtrinsics(options);
    expect(result[0].node).toBe('Ethereum');
    expect(result[0].type).toBe('ETH_TRANSFER');
  });

  it('handles TO_ETH transaction type correctly', async () => {
    const options: TBuildTransferExtrinsicsOptions = {
      ...MOCK_TRANSFER_OPTIONS,
      exchange: 'AcalaDex',
      to: 'Ethereum',
      type: TransactionType.TO_ETH,
      assetHubAddress: '14Ghg2yZAxxNhiDF97iYrgk7CwRErEmQR4UpuXaa7JXpVKig',
      ethAddress: '0x1234567890123456789012345678901234567890',
    };
    const result = await buildTransferExtrinsics(options);
    expect(result[0].node).toBe('AssetHubPolkadot');
    expect(result[0].type).toBe('EXTRINSIC');
  });

  it('handles TO_DESTINATION transaction type correctly', async () => {
    const options: TBuildTransferExtrinsicsOptions = {
      ...MOCK_TRANSFER_OPTIONS,
      exchange: 'AcalaDex',
      to: 'Ethereum',
      type: TransactionType.TO_DESTINATION,
      assetHubAddress: '14Ghg2yZAxxNhiDF97iYrgk7CwRErEmQR4UpuXaa7JXpVKig',
      ethAddress: '0x1234567890123456789012345678901234567890',
    };
    const result = await buildTransferExtrinsics(options);
    expect(result[0].node).toBe('Acala');
    expect(result[0].type).toBe('EXTRINSIC');
    expect(result[1].node).toBe('AssetHubPolkadot');
    expect(result[1].type).toBe('EXTRINSIC');
  });

  it('handles TO_DESTINATION transaction type correctly - non Ethereum', async () => {
    const options: TBuildTransferExtrinsicsOptions = {
      ...MOCK_TRANSFER_OPTIONS,
      exchange: 'AcalaDex',
      to: 'Hydration',
      type: TransactionType.TO_DESTINATION,
    };
    const result = await buildTransferExtrinsics(options);
    expect(result[0].node).toBe('Acala');
    expect(result[0].type).toBe('EXTRINSIC');
  });

  it('handles TO_EXCHANGE transaction type correctly', async () => {
    const options: TBuildTransferExtrinsicsOptions = {
      ...MOCK_TRANSFER_OPTIONS,
      exchange: 'AcalaDex',
      from: 'Ethereum',
      currencyFrom: 'WETH',
      type: TransactionType.TO_EXCHANGE,
      assetHubAddress: '14Ghg2yZAxxNhiDF97iYrgk7CwRErEmQR4UpuXaa7JXpVKig',
      ethAddress: '0x1234567890123456789012345678901234567890',
    };
    const result = await buildTransferExtrinsics(options);
    expect(result[0].node).toBe('Ethereum');
    expect(result[0].type).toBe('ETH_TRANSFER');
    expect(result[1].node).toBe('AssetHubPolkadot');
    expect(result[1].type).toBe('EXTRINSIC');
  });

  it('handles TO_EXCHANGE transaction type correctly - from Ethereum to Ethereum', async () => {
    const options: TBuildTransferExtrinsicsOptions = {
      ...MOCK_TRANSFER_OPTIONS,
      exchange: 'HydrationDex',
      from: 'Ethereum',
      currencyFrom: 'WETH',
      currencyTo: 'WBTC',
      to: 'Ethereum',
      type: TransactionType.TO_EXCHANGE,
      assetHubAddress: '14Ghg2yZAxxNhiDF97iYrgk7CwRErEmQR4UpuXaa7JXpVKig',
      ethAddress: '0x1234567890123456789012345678901234567890',
    };
    const result = await buildTransferExtrinsics(options);
    expect(result[0].node).toBe('Ethereum');
    expect(result[0].type).toBe('ETH_TRANSFER');
    expect(result[1].node).toBe('AssetHubPolkadot');
    expect(result[1].type).toBe('EXTRINSIC');
  });

  it('handles TO_EXCHANGE transaction type correctly - non Ethereum', async () => {
    const options: TBuildTransferExtrinsicsOptions = {
      ...MOCK_TRANSFER_OPTIONS,
      exchange: 'AcalaDex',
      to: 'Hydration',
      type: TransactionType.TO_EXCHANGE,
    };
    const result = await buildTransferExtrinsics(options);
    expect(result[0].node).toBe('Astar');
    expect(result[0].type).toBe('EXTRINSIC');
  });

  it('handles SWAP transaction type correctly', async () => {
    const options: TBuildTransferExtrinsicsOptions = {
      ...MOCK_TRANSFER_OPTIONS,
      exchange: 'AcalaDex',
      to: 'Hydration',
      type: TransactionType.SWAP,
    };
    const result = await buildTransferExtrinsics(options);
    expect(result[0].node).toBe('Acala');
    expect(result[0].type).toBe('EXTRINSIC');
  });
});
