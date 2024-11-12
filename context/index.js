'use client'

import { wagmiAdapter, projectId } from '@/config'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createAppKit } from '@reown/appkit/react' 
import { baseSepolia, defineChain } from '@reown/appkit/networks'
import React from 'react'
import { cookieToInitialState, WagmiProvider } from 'wagmi'

// Set up queryClient
const queryClient = new QueryClient()

if (!projectId) {
  throw new Error('Project ID is not defined')
}

const openCampusCodex = defineChain({
    id: 656476,
    name: 'Open Campus Codex',
    nativeCurrency: {
      decimals: 18,
      name: 'EDU',
      symbol: 'EDU',
    },
    rpcUrls: {
        default: {
          http: ['https://open-campus-codex-sepolia.drpc.org'],
        },
        public: {
          http: ['https://open-campus-codex-sepolia.drpc.org'],
        },
      },
      blockExplorers: {
        default: {
          name: 'Open Campus Codex Explorer',
          url: 'https://opencampus-codex.blockscout.com',
        },
      },
      testnet: true
  })

  const rootstock = defineChain({
    id: 31,
    name: 'Rootstock Testnet',
    nativeCurrency: {
      decimals: 18,
      name: 'TRBTC',
      symbol: 'tRBTC',
    },
    rpcUrls: {
        default: {
          http: ['https://rpc.testnet.rootstock.io/Nr1VeCKWPG6wg7glJRkc17Wi8Keb9M-T'],
        },
        public: {
          http: ['https://rpc.testnet.rootstock.io/Nr1VeCKWPG6wg7glJRkc17Wi8Keb9M-T'],
        },
      },
      blockExplorers: {
        default: {
          name: 'Rootstock Explorer',
          url: 'https://explorer.testnet.rootstock.io/',
        },
      },
      testnet: true
  })

  const citrea = defineChain({
    id: 5115,
    name: 'Citrea Testnet',
    nativeCurrency: {
      decimals: 18,
      name: 'Citrea BTC',
      symbol: 'cBTC',
    },
    rpcUrls: {
        default: {
          http: ['https://rpc.testnet.citrea.xyz'],
        },
        public: {
          http: ['https://rpc.testnet.citrea.xyz'],
        },
      },
      blockExplorers: {
        default: {
          name: 'Citrea Explorer',
          url: 'https://explorer.testnet.citrea.xyz',
        },
      },
      testnet: true
  })


// Set up metadata
const metadata = {
  name: 'stocked',
  description: 'AppKit Example',
  url: 'https://reown.com/appkit', // origin must match your domain & subdomain
  icons: ['https://assets.reown.com/reown-profile-pic.png']
}

// Create the modal
const modal = createAppKit({
  adapters: [wagmiAdapter],
  projectId,
  networks: [baseSepolia, openCampusCodex, citrea, rootstock],
  defaultNetwork: openCampusCodex,
  metadata: metadata,
  features: {
    analytics: true, // Optional - defaults to your Cloud configuration
  }
})




function ContextProvider({ children, cookies }) {
  const initialState = cookieToInitialState(wagmiAdapter.wagmiConfig, cookies)

  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig} initialState={initialState}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  )
}

export default ContextProvider