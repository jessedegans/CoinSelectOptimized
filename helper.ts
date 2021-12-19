const TX_INPUT_BASE =  32 + 4 + 1 + 4;
const TX_INPUT_PUBKEYHASH = 107;
const TX_EMPTY_SIZE = 4 + 1 + 1 + 4;
const TX_OUTPUT_BASE = 8 + 1;
const TX_OUTPUT_PUBKEYHASH = 25;

/**
 * Helper methods for the Algo
 */
export abstract class OUSHelper {
    
    // order by descending value, minus the inputs approximate fee
    public static utxoScore (x, feeRate) {
        return x.value - (feeRate * this.inputBytes(x))
    }
    public static transactionBytes (inputs, outputs) {
        let that = this;
        return TX_EMPTY_SIZE +
        inputs.reduce(function (a, x) { return a + that.inputBytes(x) }, 0) +
        outputs.reduce(function (a, x) { return a + that.outputBytes(x) }, 0)
    }
    
    public static sumOrNaN (range) {
        let that = this;
        return range.reduce(function (a, x) { return a + that.uintOrNaN(x.value) }, 0)
    }
    public static inputBytes (input) {
        return TX_INPUT_BASE + (input.script ? input.script.length : TX_INPUT_PUBKEYHASH)
    }
    public static outputBytes (output) {
        return TX_OUTPUT_BASE + (output.script ? output.script.length : TX_OUTPUT_PUBKEYHASH)
    }
    public static uintOrNaN (v) {
        if (typeof v !== 'number') return NaN
        if (!isFinite(v)) return NaN
        if (Math.floor(v) !== v) return NaN
        if (v < 0) return NaN
        return v
    }
    public static dustThreshold (output, feeRate) {
        /* ... classify the output for input estimate  */
        return this.inputBytes({}) * feeRate
    }

    public static finalize (inputs, outputs, feeRate) {
        var bytesAccum = this.transactionBytes(inputs, outputs)
        var feeAfterExtraOutput = feeRate * (bytesAccum + this.outputBytes({}))
        var remainderAfterExtraOutput = this.sumOrNaN(inputs) - (this.sumOrNaN(outputs) + feeAfterExtraOutput)
      
        // is it worth a change output?
        if (remainderAfterExtraOutput > this.dustThreshold({}, feeRate)) {
          outputs = outputs.concat({ value: remainderAfterExtraOutput })
        }
      
        var fee = this.sumOrNaN(inputs) - this.sumOrNaN(outputs)
        if (!isFinite(fee)) return { fee: feeRate * bytesAccum }
      
        return {
          inputs: inputs,
          outputs: outputs,
          fee: fee
        }
      }

    public static accumulative (utxos, outputs, feeRate) {
        if (!isFinite(this.uintOrNaN(feeRate))) return {}
        var bytesAccum = this.transactionBytes([], outputs)
      
        var inAccum = 0
        var inputs = []
        var outAccum = this.sumOrNaN(outputs)
      
        for (var i = 0; i < utxos.length; ++i) {
          var utxo = utxos[i]
          var utxoBytes = this.inputBytes(utxo)
          var utxoFee = feeRate * utxoBytes
          var utxoValue = this.uintOrNaN(utxo.value)
      
          // skip detrimental input
          if (utxoFee > utxo.value) {
            if (i === utxos.length - 1) return { fee: feeRate * (bytesAccum + utxoBytes) }
            continue
          }
      
          bytesAccum += utxoBytes
          inAccum += utxoValue
          inputs.push(utxo)
      
          var fee = feeRate * bytesAccum
      
          // go again?
          if (inAccum < outAccum + fee) continue
      
          return this.finalize(inputs, outputs, feeRate)
        }
      
        return { fee: feeRate * bytesAccum }
    }
}
