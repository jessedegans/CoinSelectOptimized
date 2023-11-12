
# Optimized Coin Selection Algorithm
Source code for an optimized coin select algorithm


### Bitcoin Coin Select Explained
Coin selection is the process through which a wallet decides which Unspent Transaction Outputs (UTXOs) to utilize in a specific transaction. In the early days, many Bitcoin wallets employed straightforward strategies like spending UTXOs in the order they were received (first-in, first-out). However, with the rising concern over fees, I developed a sophisticated algorithm aimed at minimizing transaction fees and preventing the accumulation of 'dust'—small, negligible amounts in transactions.

### Story

One significant challenge in creating a Bitcoin transaction lies in the selection of the appropriate UTXOs. The goal is to choose UTXOs whose total value equals or exceeds the desired amount. However, it's equally important to avoid an excessive number of UTXOs, as this would increase the transaction size in bytes, leading to higher fees.

Most conventional coin selection algorithms prioritize obtaining the exact transaction amount and often overlook the size of the UTXO set. This approach results in residual 'dust' in transactions that come close to the required amount.

For instance, if I were to send 0.01 BTC, I would select UTXOs totaling 0.0104 BTC (1040000 sat), incurring a fee of approximately 0.00034 BTC (34000 sat). This process generates a new UTXO for myself valued at 0.00006 BTC (6000 sat), nearly equivalent to the fees paid for utilizing that UTXO.

## How the algorithm works

I choose to implement the Branch and Bound algorithm to enhance coin selection. 
The primary concept is to minimize the UTXO set, effectively reducing 'Dust' (insignificant amounts) and associated fees. 
According to Mark Erhart's research, the Branch and Bound algorithm successfully decreased bitcoin change in about 40% of transactions, which would have otherwise generated larger numbers of UTXOs.

## Effective Value

The initial step involves enhancing UTXOs by introducing the concept 'effective value' This calculation is performed before UTXO selection, leveraging fixed sizes of input and output scripts, along with known costs per input and output. The effective value represents the true worth of the UTXO, obtained by subtracting the associated transaction inclusion costs. The formula for calculating the effective value is straightforward: 
effectiveValue = utxo.value − feePerByte × bytesPerInput

## The tree

Instead of restarting the search multiple times, we can search all possible combinations
exhaustively. We construct a binary tree where on each level we decide if we include or
exclude a UTXO. The UTXO’s are added to the binary tree in descending order(High to low).
For example, we want to send 0.14 BTC and we have the following UTXO set: 0.1 BTC, 0.09
BTC, and 0.05 BTC.

[![tekening.png](https://i.postimg.cc/pL2DCr2y/tekening.png)](https://postimg.cc/VdVrLY0c)

At each node, a decision is made to either include or omit the UTXO. Upon quick evaluation, if including 0.09 results in a sum of 0.19, surpassing our desired 0.14 BTC, the algorithm opts to omit the UTXO. This algorithm prioritizes inclusion, attempting to include first. In this instance, it successfully includes 0.05 BTC, finding a match. Backtracking is used if inclusion leads to child nodes with no viable solution, requiring a return to the previous level and exploration of the exclusion branch.

To prevent endless calculations and potential long computation times, a maximum tries limit of 100,000 is set. Beyond this threshold, the algorithm either shifts to a different strategy, such as blackjack, or fallsback completely to accumulative selection.
