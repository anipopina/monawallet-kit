// サーバー側の処理を模したもの。実際のアプリでは monawallet-kit/server をAPIサーバー（Lambda等）で使い、
// nonceはDBにTTL付きで保存して、条件付き更新などで原子的に使用済みにする。
import { createSignInChallenge, verifySignIn } from 'monawallet-kit/server'

const APP_NAME = 'MonaWallet Kit Demo'
const issued = new Map<string, { address: string; message: string; expiresAt: number }>()

export function requestChallenge(address: string) {
  const challenge = createSignInChallenge({ appName: APP_NAME, origin: location.origin, address })
  issued.set(challenge.nonce, { address, message: challenge.message, expiresAt: challenge.expiresAt.getTime() })
  return { message: challenge.message }
}

export async function login(address: string, message: string, signature: string) {
  const { address: verified } = await verifySignIn({
    message,
    signature,
    address,
    expected: { appName: APP_NAME, origin: location.origin },
    consumeNonce: (nonce, challenge) => {
      const record = issued.get(nonce)
      if (!record || record.address !== challenge.address || record.message !== challenge.message || record.expiresAt <= Date.now())
        return false
      issued.delete(nonce)
      return true
    },
  })
  return { sessionAddress: verified }
}
