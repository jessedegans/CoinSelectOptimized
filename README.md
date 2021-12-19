
# MachineLearningLegoSorting
Source code for my version of a new coin select algorithm


### Bitcoin Coin Select Explained
Coin selection is the method a wallet uses to choose which of its UTXOs to spend in a particular transaction.
Most early Bitcoin wallets implemented relatively simple coin selection strategies, such as spending UTXOs in the order they were received (first-in, first-out), but as fees have become more of a concern, I have created a new and more advanced algorithm that tries to minimize transaction fee and prevent dust.


### Story

One of the major problems of creating a bitcoin transaction is selecting the right UTXO’s.
You want to select UTXO’s where the sum is equal to or greater than the desired amount.
But you also don’t want too many UTXO’s since that would make the transaction bigger in
bytes which results in higher fees.

The most general coin selection algorithms are focused on getting the exact amount and
don’t really care about the size of the UTXO set. Because every transaction that comes
close to the amount will result in small dust being left over.

For example, if I would send someone 0.01 BTC. For that, I select UTXOs that equal to
0.0104 BTC (1040000 sat) and my fee would be around 0.00034 BTC (34000 sat). That would result in a new UTXO
for myself with the value of 0.00006 BTC (6000 sat), which is almost as high as the fees I will pay for
using that UTXO. 

## How the algorithm works

I choose to implement the Branch and Bound algorithm to optimize coin selection. The main
idea is that it would shrink the UTXO set and it reduces “Dust” (worthless amounts) and
fees. According to Mark Erhart’s research “BnB was able to reduce bitcoin change in
approximately 40 percent of transactions that would otherwise have produced bigger
numbers of UTXOs.”

## Effective Value

The first thing to do is to prepare the UTXO’s by adding something called an effective value
to these UTXO’s. We can calculate a fee before the utxo selection since the input and
output scripts are fixed sizes and the cost per input and output are fixed known values. The
idea of the effective value is that it is the value of the utxo when we subtract the costs of
including it in the transaction. The effective value is easily calculated as followed:
effectiveValue = utxo.value − feePerByte × bytesPerInput

## The tree

Instead of restarting the search multiple times, we can search all possible combinations
exhaustively. We construct a binary tree where on each level we decide if we include or
exclude a UTXO. The UTXO’s are added to the binary tree in descending order(High to low).
For example, we want to send 0.14 BTC and we have the following UTXO set: 0.1 BTC, 0.09
BTC, and 0.05 BTC.

[![tekening.png](https://i.postimg.cc/pL2DCr2y/tekening.png)](https://postimg.cc/VdVrLY0c)

At each node, we decide if we include or omit the UTXO. We quickly see that if we include
the 0.09 that would result in 0.19 which exceeds our desired value of 0.14 BTC so It decides
to omit the UTXO. Our algorithm is inclusion first so it first tries to include. It includes the
0.05 BTC and it seems to have a match. Backtracking is also used if we included something
but then their child nodes give us no solution. We would need to go back to one level and
try the omitting branch(It is called “exclusion branch” in code).
To prevent the endless calculation of ways and possibly long computation time, the max
tries are set to 100000. After that, it will either just switch to blackjack or accumulative
selection.
