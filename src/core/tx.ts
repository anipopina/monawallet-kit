import { hex } from '@scure/base'
import * as btcSigner from '@scure/btc-signer'
import { DUST_THRESHOLD_SAT, MONA_NETWORK, TX_VSIZE } from './constants'
import { formatMona } from './amount'
import { MonaWalletError } from './errors'
import type { Utxo } from './providers'

export function estimateFeeSat(inputCount: number, outputCount: number, feeRate: number): number {
  return Math.ceil((inputCount * TX_VSIZE.input + outputCount * TX_VSIZE.output + TX_VSIZE.overhead) * feeRate)
}

export type CoinSelection = {
  inputs: Utxo[]
  /** 実際に支払う手数料（お釣りがダストになる場合はその分を含む） */
  feeSat: number
  /** 0ならお釣りの出力なし */
  changeSat: number
}

/**
 * 承認済みを優先し、金額の大きい順にUTXOを足していく。
 * 旧実装は「金額+0.001MONA」で選択を打ち切ってから手数料を計算していたため、入力が多いと残高があっても失敗していた。
 * ここでは入力を追加するたびに手数料込みで判定する。
 */
export function selectCoins(utxos: Utxo[], amountSat: number, feeRate: number): CoinSelection {
  const ordered = [...utxos].sort((a, b) => Number(b.confirmed) - Number(a.confirmed) || b.value - a.value)
  const inputs: Utxo[] = []
  let total = 0
  for (const utxo of ordered) {
    inputs.push(utxo)
    total += utxo.value
    const feeWithChange = estimateFeeSat(inputs.length, 2, feeRate)
    const change = total - amountSat - feeWithChange
    if (change > DUST_THRESHOLD_SAT) return { inputs, feeSat: feeWithChange, changeSat: change }
    // お釣りがダストなら出力1つの手数料で足りるか判定し、差額は手数料に回す
    if (total - amountSat >= estimateFeeSat(inputs.length, 1, feeRate)) return { inputs, feeSat: total - amountSat, changeSat: 0 }
  }
  const required = amountSat + estimateFeeSat(Math.max(inputs.length, 1), 1, feeRate)
  throw new MonaWalletError(
    'insufficient_funds',
    `Insufficient balance. Need about ${formatMona(required)} MONA, have ${formatMona(total)} MONA`,
  )
}

/** P2PKH入力はnonWitnessUtxo（前のトランザクション全体）が必要 */
export function buildTransaction(params: {
  inputs: (Utxo & { prevTxHex: string })[]
  toAddress: string
  amountSat: number
  changeAddress: string
  changeSat: number
}): btcSigner.Transaction {
  const tx = new btcSigner.Transaction()
  for (const input of params.inputs) {
    tx.addInput({ txid: input.txid, index: input.vout, nonWitnessUtxo: hex.decode(input.prevTxHex) })
  }
  tx.addOutputAddress(params.toAddress, BigInt(params.amountSat), MONA_NETWORK)
  if (params.changeSat > 0) tx.addOutputAddress(params.changeAddress, BigInt(params.changeSat), MONA_NETWORK)
  return tx
}
