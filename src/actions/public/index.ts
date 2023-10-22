import type { Address, Hash, PublicClient } from 'viem'
import { EstimateSafeTransactionGasArgs, estimateSafeTransactionGas } from './estimateSafeTransactionGas.js'
import { GetSafeTransactionHashArgs, getSafeTransactionHash } from './getSafeTransactionHash.js'
import { EstimateSafeTransactionBaseGasArgs, estimateSafeTransactionBaseGas } from './estimateSafeTransactionBaseGas.js'

export type PublicSafeActions = {
  estimateSafeTransactionGas: (args: EstimateSafeTransactionGasArgs) => Promise<bigint>
  getSafeTransactionHash: (args: GetSafeTransactionHashArgs) => Promise<Hash>
  estimateSafeTransactionBaseGas: (args: EstimateSafeTransactionBaseGasArgs) => Promise<bigint>
}

export const publicSafeActions = (safeAddress: Address): ((client: PublicClient) => PublicSafeActions) => {
  return (client) => ({
    estimateSafeTransactionGas: (args) => estimateSafeTransactionGas(client, safeAddress, args),
    getSafeTransactionHash: (args) => getSafeTransactionHash(client, safeAddress, args),
    estimateSafeTransactionBaseGas: (args) => estimateSafeTransactionBaseGas(client, safeAddress, args),
  })
}

export { estimateSafeTransactionBaseGas, estimateSafeTransactionGas, getSafeTransactionHash }
