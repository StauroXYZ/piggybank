import { afterEach } from 'vitest'

async function fetchLogs(url: string): Promise<string[]> {
  const response = await fetch(new URL(`logs`, url), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  const result = (await response.json())

  if (result.success === false) {
    throw new Error(result.reason)
  }

  return result.logs
}

afterEach(async (context) => {
  context.onTestFailed(async () => {
    // If a test fails, you can fetch and print the logs of your anvil instance.
    const logs = await fetchLogs('http://localhost:8545')
    // Only print the 20 most recent log messages.
    console.log(...logs.slice(-20))
  })
})
