# DataX Troubleshooting Guide

## Common Issues and Solutions

### "Nothing happens when buying a dataset"

If you click "Buy Now" on a dataset and nothing happens (no MetaMask popup appears), try the following steps:

1. **Check your console for errors**
   - Open your browser's developer console (F12 or right-click > Inspect > Console)
   - Look for any error messages related to transactions or MetaMask

2. **Verify MetaMask is unlocked**
   - Open your MetaMask extension and ensure it's unlocked
   - Make sure you're connected to the correct network (Localhost 8545)
   - Ensure the correct account is selected

3. **Use the troubleshooting tools**
   - In your browser console, run:
   ```javascript
   fetch('/debug.js').then(res => res.text()).then(js => eval(js))
   ```
   - Then diagnose the issue with your dataset ID and wallet address:
   ```javascript
   DataXDebug.diagnoseTokenPurchase('YOUR_DATASET_ID', 'YOUR_WALLET_ADDRESS')
   ```
   - To attempt an automatic fix:
   ```javascript
   DataXDebug.fixTokenPurchase('YOUR_DATASET_ID', 'YOUR_WALLET_ADDRESS')
   ```

4. **Force MetaMask connection**
   - Click the MetaMask extension
   - Connect to the current site if prompted
   - Try the purchase again

### "THREE.WebGLRenderer: Context Lost" Error

This error affects the 3D visualization of datasets and may occur alongside purchase issues:

1. **Refresh the page**
   - Simply refreshing the page often resolves WebGL context issues

2. **Use the WebGL reset tool**
   - In your browser console, run:
   ```javascript
   fetch('/debug.js').then(res => res.text()).then(js => eval(js))
   ```
   - Then reset the WebGL context:
   ```javascript
   checkWebGLError()
   ```

3. **Check hardware acceleration**
   - Make sure your browser has hardware acceleration enabled
   - Consider updating your graphics drivers

### Gas Limit Issues

If transactions fail with "out of gas" errors:

1. **Increase gas limits**
   - The application should automatically set appropriate gas limits
   - If issues persist, use the debug tools to ensure proper gas limits:
   ```javascript
   DataXDebug.executePurchase() // This doubles the gas limit for safety
   ```

2. **Check Hardhat configuration**
   - Ensure your local Hardhat node is configured with sufficient gas limits
   - See `CONTRACTS-README.md` for recommended configurations

### Finding Your Dataset ID

To use the debug tools, you'll need your dataset ID:

1. Look in the URL when viewing a dataset - it should be in the format: `/datasets/view/[DATASET_ID]`
2. Or find it in the database via your profile page

### Finding Your Wallet Address

To use the debug tools, you'll need your MetaMask wallet address:

1. Open MetaMask and copy your account address
2. Or run this in the console:
```javascript
ethereum.request({ method: 'eth_requestAccounts' }).then(accounts => console.log(accounts[0]))
```

## Advanced Troubleshooting

If the above steps don't resolve your issue:

1. **Clear browser cache and cookies**
   - This can resolve issues with stale data or corrupted state

2. **Check authentication**
   - Ensure you're properly logged in
   - Try logging out and back in

3. **Inspect network requests**
   - In the browser's dev tools, go to the Network tab
   - Look for failed API requests when attempting a purchase

4. **Check contract deployment**
   - Verify that contracts are properly deployed
   - Use `scripts/check-contracts.js` to verify deployment

5. **Contact support**
   - If issues persist, reach out to support with details from your troubleshooting steps
   - Include any error messages from the console 