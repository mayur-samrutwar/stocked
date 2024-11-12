
import { cookieStorage, createStorage, http } from '@wagmi/core';
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import { baseSepolia, polygonAmoy, defineChain } from '@reown/appkit/networks';

// Get projectId from https://cloud.reown.com
export const projectId = 'c13f4ce46cefc0c967f0c802c28b3eb9';

if (!projectId) {
  throw new Error('Project ID is not defined');
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


export const networks = [ baseSepolia, citrea, rootstock];


// Set up the Wagmi Adapter (Config)
export const wagmiAdapter = new WagmiAdapter({
  storage: createStorage({
    storage: cookieStorage
  }),
  ssr: true,
  projectId,
  networks
});

export const config = wagmiAdapter.wagmiConfig;