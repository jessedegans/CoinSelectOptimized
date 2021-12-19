import { OUSHelper } from "./helper";
const TX_INPUT_BASE =  32 + 4 + 1 + 4;
const TX_INPUT_PUBKEYHASH = 107;
const TX_OUTPUT_BASE = 8 + 1;
const TX_OUTPUT_PUBKEYHASH = 25;
const TX_EMPTY_SIZE = 4 + 1 + 1 + 4;

const maxTries = 100000;

export abstract class OptimizedCoinSelect { 
  private static calculateEffectiveValues (utxos, feeRate) {
    return utxos.map(function (utxo) {
      if (isNaN(OUSHelper.uintOrNaN(utxo.value))) {
        return {
          utxo: utxo,
          effectiveValue: 0
        }
      }
  
      var effectiveFee = OUSHelper.inputBytes(utxo) * feeRate
      var effectiveValue = utxo.value - effectiveFee
      return {
        utxo: utxo,
        effectiveValue: effectiveValue
      }
    })
  }
  /**
   * Selects the right utxos for a new transaction. It first tries the optimized BNB implementation 
   * but if no good match is found it will fallback to accumulative (which always has a result)
   * @utxos list of utxos
   * @outputs list of outputs
   * @feeRate Satoshis per byte
   * @returns selected utxos, outputs and the calculated fee. 
   */
  public static selectUtxo(utxos,outputs,feerate){

    //sort descending order
    utxos = utxos.concat().sort(function (a, b) {
      return OUSHelper.utxoScore(b, feerate) - OUSHelper.utxoScore(a, feerate)
    })

    //try branch and bound approach, the best way to select utxos
    let result:any = UtxoHelper.branchAndBound(utxos,outputs,feerate);
    if (result.inputs) return result;
    
    
    //fallback to accumulative from BitcoinJS lib
    console.log("Selecting UTXO's using branch and bound failed");
    result = OUSHelper.accumulative(utxos,outputs,feerate);
    
    if (!result.inputs){
      throw Error("failed to select UTXO's, Do you have enough balance?")
    } 
    
    console.log("Succesfully selected UTXO's for transaction");
    return result;
  }
  
  /**
   * Selects coins such that their sum is equal to or greater than the spending target
   * @utxos list of utxos
   * @outputs list of outputs
   * @feeRate Satoshis per byte
   * @returns exact match or suboptimal solution will be given, the function will return nothing if it fails to get a good match under maxTries
   */
  
  public static branchAndBound (utxos, outputs, feeRate):any {
      if (!isFinite(OUSHelper.uintOrNaN(feeRate))) return {}
    
      var costPerOutput = OUSHelper.outputBytes({}) * feeRate;
      var costPerInput = OUSHelper.inputBytes({}) * feeRate;
      var costOfChange = costPerInput + costPerOutput;
    
      var outAccum = OUSHelper.sumOrNaN(outputs);

      //Select and sort utxos with effective values where effectiveValue = utxo.value − feePerByte * bytesPerInput
      var effectiveUtxos = this.calculateEffectiveValues(utxos, feeRate).filter(function (x) {
        return x.effectiveValue > 0;
      }).sort(function (a, b) {
        return b.effectiveValue - a.effectiveValue;
      }) 
      // Depth first search
      var selected = this.search(effectiveUtxos, outAccum, costOfChange);
      if (selected != null) {
        var inputs = [];
    
        for (var i = 0; i < effectiveUtxos.length; i++) {
          if (selected[i]) {
            inputs.push(effectiveUtxos[i].utxo);
          }
        }
    
        return OUSHelper.finalize(inputs, outputs, feeRate)
      } else {
        const fee = feeRate * utxos.reduce(function (a, x) {
          return a + OUSHelper.inputBytes(x)
        }, 0);
    
        return {
          fee: fee
        };
      }
    }

  private static search (effectiveUtxos, target, costOfChange) {
    if (effectiveUtxos.length === 0) {
      return;
    }

    var tries = maxTries;

    var selected = []; //keeps track of selected utxos index (true/false)
    var selectedAccum = 0; // sum of effective values

    var traversingExclusion = []; //again array of T/F if true traversing omitting branch at this index

    var done = false;
    var backtrack = false;

    var remaining = effectiveUtxos.reduce(function (a, x) {
      return a + x.effectiveValue;
    }, 0);
   

    var depth = 0
    while (!done) {
      if (tries <= 0) { // Too many tries, exit
        return;
      } else if (selectedAccum > target + costOfChange) { // Selected value is out of range, go back and try other branch
        backtrack = true;
      } else if (selectedAccum >= target) { // Selected value is within range
        done = true;
      } else if (depth >= effectiveUtxos.length) { // Leaf node
        backtrack = true;
      } else if (selectedAccum + remaining < target) { // Cannot possibly reach target with amount remaining
        if (depth === 0) { // At the first utxo it means insufficient funds
          return;
        } else {
          backtrack = true;
        }
      } else { // Continue down this branch
        // Remove this utxo from the remaining utxo amount
        remaining -= effectiveUtxos[depth].effectiveValue;
        // Inclusion branch first
        selected[depth] = true;
        selectedAccum += effectiveUtxos[depth].effectiveValue;
       
        depth++;
      }

      // Step back to the previous utxo and try the other branch
      if (backtrack) {
        backtrack = false;
        depth--;
        // Walk backwards to find the first utxo which has not has its second branch traversed
        while (traversingExclusion[depth]) {
          // Reset this utxo's selection
          if (selected[depth]) {
            selectedAccum -= effectiveUtxos[depth].effectiveValue;
          }
          selected[depth] = false;
          traversingExclusion[depth] = false;
          remaining += effectiveUtxos[depth].effectiveValue;

          // Step back one
          depth--;

          if (depth < 0) { // We have walked back to the first utxo and no branch is untraversed. No solution, exit.
            return;
          }
        }

        if (!done) {
          // Now traverse the second branch of the utxo we have arrived at.
          traversingExclusion[depth] = true;

          // These were always included first, try excluding now
          selected[depth] = false;
          selectedAccum -= effectiveUtxos[depth].effectiveValue;
          depth++;
        }
      }
      tries--;
    }
    return selected;
  }
}
