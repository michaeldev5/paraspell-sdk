// Unit tests for main entry point functions

import { vi, describe, it, expect, beforeEach, type MockInstance } from 'vitest';
import * as transferToExchange from './transferToExchange';
import * as swap from './swap';
import * as transferToDestination from './transferToDestination';
import * as transferToEthereum from './transferToEthereum';
import * as transferFromEthereum from './transferFromEthereum';
import { transfer } from './transfer';
import { MOCK_TRANSFER_OPTIONS } from '../utils/utils.test';
import { TransactionType, type TTransferOptions } from '../types';
import * as selectBestExchange from './selectBestExchange';
import type ExchangeNode from '../dexNodes/DexNode';
import { Signer as EthSigner } from 'ethers';
import { Signer } from '@polkadot/types/types';
import { createApiInstanceForNode } from '@paraspell/sdk';
import { ApiPromise } from '@polkadot/api';

vi.mock('@paraspell/sdk', async () => {
  const actual = await vi.importActual('@paraspell/sdk');
  return {
    ...actual,
    createApiInstanceForNode: vi.fn().mockResolvedValue({
      disconnect: async () => {},
    }),
  };
});

describe('transfer', () => {
  let transferToExchangeSpy: MockInstance;
  let swapSpy: MockInstance;
  let createSwapExtrinsicSpy: MockInstance;
  let transferToDestinationSpy: MockInstance;
  let transferToEthereumSpy: MockInstance;
  let transferFromEthereumSpy: MockInstance;

  beforeEach(() => {
    vi.resetAllMocks();
  });

  beforeEach(() => {
    transferToExchangeSpy = vi
      .spyOn(transferToExchange, 'transferToExchange')
      .mockResolvedValue('');
    swapSpy = vi.spyOn(swap, 'swap').mockResolvedValue('');
    createSwapExtrinsicSpy = vi.spyOn(swap, 'createSwapExtrinsic').mockResolvedValue({
      amountOut: '1',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tx: {} as any,
    });
    transferToDestinationSpy = vi
      .spyOn(transferToDestination, 'transferToDestination')
      .mockResolvedValue('');

    transferToEthereumSpy = vi.spyOn(transferToEthereum, 'transferToEthereum').mockResolvedValue();
    transferFromEthereumSpy = vi
      .spyOn(transferFromEthereum, 'transferFromEthereum')
      .mockResolvedValue();
    transferFromEthereumSpy = vi
      .spyOn(transferFromEthereum, 'transferFromEthereum')
      .mockResolvedValue();

    vi.mocked(createApiInstanceForNode).mockResolvedValue({
      disconnect: async () => {},
    } as ApiPromise);
  });

  it('main transfer function - FULL_TRANSFER scenario - manual exchange', async () => {
    const options: TTransferOptions = {
      ...MOCK_TRANSFER_OPTIONS,
      exchange: 'AcalaDex',
      type: TransactionType.FULL_TRANSFER,
    };
    await transfer(options);
    expect(transferToExchangeSpy).toHaveBeenCalled();
    expect(createSwapExtrinsicSpy).toHaveBeenCalled();
    expect(swapSpy).toHaveBeenCalled();
    expect(transferToDestinationSpy).toHaveBeenCalled();
  });

  it('main transfer function - FULL_TRANSFER scenario - auto exchange', async () => {
    const options: TTransferOptions = {
      ...MOCK_TRANSFER_OPTIONS,
      exchange: undefined,
      type: TransactionType.FULL_TRANSFER,
    };

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

    await transfer(options);
    expect(transferToExchangeSpy).toHaveBeenCalled();
    expect(swapSpy).toHaveBeenCalled();
    expect(selectBestExchangeSpy).toHaveBeenCalledTimes(1);
    expect(transferToDestinationSpy).toHaveBeenCalled();
  });

  it('main transfer function - TO_EXCHANGE scenario', async () => {
    const options: TTransferOptions = {
      ...MOCK_TRANSFER_OPTIONS,
      exchange: 'AcalaDex',
      type: TransactionType.TO_EXCHANGE,
    };
    await transfer(options);
    expect(transferToExchangeSpy).toHaveBeenCalled();
    expect(swapSpy).not.toHaveBeenCalled();
    expect(transferToDestinationSpy).not.toHaveBeenCalled();
  });

  it('main transfer function - TO_EXCHANGE - Ethereum scenario', async () => {
    const options: TTransferOptions = {
      ...MOCK_TRANSFER_OPTIONS,
      from: 'Ethereum',
      exchange: 'HydrationDex',
      assetHubAddress: '0xABC123',
      ethSigner: {} as EthSigner,
      type: TransactionType.TO_EXCHANGE,
    };
    await transfer(options);
    expect(transferFromEthereumSpy).toHaveBeenCalled();
  });

  it('main transfer function - SWAP scenario', async () => {
    const options: TTransferOptions = {
      ...MOCK_TRANSFER_OPTIONS,
      exchange: 'AcalaDex',
      type: TransactionType.SWAP,
    };
    await transfer(options);
    expect(transferToExchangeSpy).not.toHaveBeenCalled();
    expect(swapSpy).toHaveBeenCalled();
    expect(transferToDestinationSpy).not.toHaveBeenCalled();
  });

  it('main transfer function - TO_DESTINATION scenario', async () => {
    const options: TTransferOptions = {
      ...MOCK_TRANSFER_OPTIONS,
      exchange: 'AcalaDex',
      type: TransactionType.TO_DESTINATION,
    };
    await transfer(options);
    expect(transferToExchangeSpy).not.toHaveBeenCalled();
    expect(swapSpy).not.toHaveBeenCalled();
    expect(transferToDestinationSpy).toHaveBeenCalled();
  });

  it('main transfer function - TO_ETH scenario', async () => {
    const options: TTransferOptions = {
      ...MOCK_TRANSFER_OPTIONS,
      to: 'Ethereum',
      exchange: 'HydrationDex',
      assetHubAddress: '0xABC123',
      ethSigner: {} as EthSigner,
    };
    await transfer(options);
    expect(transferToEthereumSpy).toHaveBeenCalled();
  });

  it('main transfer function - TO_ETH scenario - TYPE', async () => {
    const options: TTransferOptions = {
      ...MOCK_TRANSFER_OPTIONS,
      to: 'Ethereum',
      exchange: 'HydrationDex',
      assetHubAddress: '0xABC123',
      type: TransactionType.TO_ETH,
      ethSigner: {} as EthSigner,
    };
    await transfer(options);
    expect(transferToEthereumSpy).toHaveBeenCalled();
  });

  it('main transfer function - FROM_ETH scenario', async () => {
    const options: TTransferOptions = {
      ...MOCK_TRANSFER_OPTIONS,
      from: 'Ethereum',
      exchange: 'HydrationDex',
      assetHubAddress: '0xABC123',
      ethSigner: {} as EthSigner,
    };
    await transfer(options);
    expect(transferFromEthereumSpy).toHaveBeenCalled();
  });

  it('main transfer function - FROM_ETH scenario - TYPE', async () => {
    const options: TTransferOptions = {
      ...MOCK_TRANSFER_OPTIONS,
      from: 'Ethereum',
      exchange: 'HydrationDex',
      assetHubAddress: '0xABC123',
      type: TransactionType.FROM_ETH,
      ethSigner: {} as EthSigner,
    };
    await transfer(options);
    expect(transferFromEthereumSpy).toHaveBeenCalled();
  });

  it('error handling - evmInjectorAddress without evmSigner', async () => {
    const options: TTransferOptions = {
      ...MOCK_TRANSFER_OPTIONS,
      exchange: 'HydrationDex',
      evmInjectorAddress: '0xDEF456',
      evmSigner: undefined,
    };
    await expect(transfer(options)).rejects.toThrow(
      'evmSigner is required when evmInjectorAddress is provided',
    );
  });

  it('error handling - evmSigner without evmInjectorAddress', async () => {
    const options: TTransferOptions = {
      ...MOCK_TRANSFER_OPTIONS,
      exchange: 'HydrationDex',
      evmInjectorAddress: undefined,
      evmSigner: {} as Signer,
    };
    await expect(transfer(options)).rejects.toThrow(
      'evmInjectorAddress is required when evmSigner is provided',
    );
  });

  it('error handling - invalid evmInjectorAddress', async () => {
    const options: TTransferOptions = {
      ...MOCK_TRANSFER_OPTIONS,
      exchange: 'HydrationDex',
      evmInjectorAddress: 'INVALID',
      evmSigner: {} as Signer,
    };
    await expect(transfer(options)).rejects.toThrow(
      'Evm injector address is not a valid Ethereum address',
    );
  });

  it('error handling - invalid injectorAddress', async () => {
    const options: TTransferOptions = {
      ...MOCK_TRANSFER_OPTIONS,
      exchange: 'HydrationDex',
      injectorAddress: '0x1501C1413e4178c38567Ada8945A80351F7B8496',
    };
    await expect(transfer(options)).rejects.toThrow(
      'Injector address cannot be an Ethereum address. Please use an Evm injector address instead.',
    );
  });

  it('error handling - missing assetHubAddress', async () => {
    const options: TTransferOptions = {
      ...MOCK_TRANSFER_OPTIONS,
      from: 'Ethereum',
      exchange: 'HydrationDex',
      assetHubAddress: undefined,
    };
    await expect(transfer(options)).rejects.toThrow(
      'AssetHub address is required when transferring to or from Ethereum',
    );
  });

  it('error handling - missing ethSigner', async () => {
    const options: TTransferOptions = {
      ...MOCK_TRANSFER_OPTIONS,
      from: 'Ethereum',
      exchange: 'HydrationDex',
      assetHubAddress: '0xABC123',
      ethSigner: undefined,
    };
    await expect(transfer(options)).rejects.toThrow(
      'Eth signer is required when transferring to or from Ethereum',
    );
  });
});
