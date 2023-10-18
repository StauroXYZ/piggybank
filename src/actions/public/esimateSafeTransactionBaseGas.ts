import {
  Address,
  Hex,
  PublicClient,
  Transport,
  encodeFunctionData,
  zeroAddress,
} from 'viem'
import { SafeTransactionData, SafeTransactionDataPartial } from '../../types.js'
import { safeAbi, safeSingletonAddress } from '../../constants.js'

// Every byte == 00 -> 4  Gas cost
const CALL_DATA_ZERO_BYTE_GAS_COST = 4

// Every byte != 00 -> 16 Gas cost (68 before Istanbul)
const CALL_DATA_BYTE_GAS_COST = 16

// gas cost initialization of a Safe
const INITIZATION_GAS_COST = 20_000

// increment nonce gas cost
const INCREMENT_NONCE_GAS_COST = 5_000

// Keccak gas cost for the hash of the Safe transaction
const HASH_GENERATION_GAS_COST = 1_500

// ecrecover gas cost for ecdsa ~= 4K gas, we use 6K
const ECRECOVER_GAS_COST = 6_000

// transfer gas cost
const TRANSAFER_GAS_COST = 32_000n

const GAS_COST_PER_SIGNATURE =
  1 * CALL_DATA_BYTE_GAS_COST +
  2 * 32 * CALL_DATA_BYTE_GAS_COST +
  ECRECOVER_GAS_COST

function estimateDataGasCosts(data: Hex): number {
  const bytes = data.match(/.{2}/g) as string[]

  return bytes.reduce((gasCost: number, currentByte: string) => {
    if (currentByte === '0x') {
      return gasCost + 0
    }

    if (currentByte === '00') {
      return gasCost + CALL_DATA_ZERO_BYTE_GAS_COST
    }

    return gasCost + CALL_DATA_BYTE_GAS_COST
  }, 0)
}

export type EstimateSafeTransactionBaseGasArgs = Pick<
  SafeTransactionData,
  'to' | 'operation'
> &
  Pick<
    SafeTransactionDataPartial,
    'data' | 'value' | 'refundReceiver' | 'gasToken' | 'safeTxGas'
  >

export const estimateSafeTransactionBaseGas = async (
  publicClient: PublicClient<Transport>,
  safeAddress: Address,
  {
    safeTxGas,
    gasToken,
    refundReceiver,
    to,
    operation,
    value,
    data,
  }: EstimateSafeTransactionBaseGasArgs
): Promise<bigint> => {
  const encodeSafeTxGas = safeTxGas || 0n
  const encodeBaseGas = 0n
  const gasPrice = 1n
  const encodeGasToken = gasToken || zeroAddress
  const encodeRefundReceiver = refundReceiver || zeroAddress
  const signatures = '0x'

  const execTransactionData = encodeFunctionData({
    abi: safeAbi,
    functionName: 'execTransaction',
    args: [
      to,
      value ?? 0n,
      data ?? '0x',
      operation,
      encodeSafeTxGas,
      encodeBaseGas,
      gasPrice,
      encodeGasToken,
      encodeRefundReceiver,
      signatures,
    ],
  })

  const safeNonce = await publicClient.readContract({
    abi: safeAbi,
    functionName: 'nonce',
    address: safeAddress,
  })

  const isSafeInitialized = safeNonce !== 0n
  const incrementNonceGasCost = isSafeInitialized
    ? INCREMENT_NONCE_GAS_COST
    : INITIZATION_GAS_COST

  const safeThreshold = await publicClient.readContract({
    abi: safeAbi,
    functionName: 'getThreshold',
    address: safeAddress,
  })

  const signaturesGasCost = safeThreshold * BigInt(GAS_COST_PER_SIGNATURE)

  let baseGas =
    signaturesGasCost +
    BigInt(estimateDataGasCosts(execTransactionData)) +
    BigInt(incrementNonceGasCost) +
    BigInt(HASH_GENERATION_GAS_COST)

  // Add additional gas costs
  baseGas > 65536n ? (baseGas += 64n) : (baseGas += 128n)

  // Base tx costs, transfer costs...
  baseGas += TRANSAFER_GAS_COST

  return baseGas
}
