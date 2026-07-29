const mongoose = require('mongoose');

const feeSchema = new mongoose.Schema(
  {
    paymentMethod: {
      type: String,
      enum: ['COD', 'CashFree', 'Both (COD & CashFree)'],
      default: 'Both (COD & CashFree)',
    },
    feeName: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
    },
    feeCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FeeCategory',
      required: true,
    },
    feeType: {
      type: String,
      required: true,
      enum: ['Fixed Amount', 'Percentage'],
    },
    flatFeeValue: {
      type: Number,
      required: false,
    },
    applicationState: {
      type: [String],
      required: true,
      validate: {
        validator: function(v) {
          return v && v.length > 0;
        },
        message: 'At least one application state must be selected'
      }
    },
    minimumOrderAmount: {
      type: Number,
      required: false,
      min: 0
    },
    maximumOrderAmount: {
      type: Number,
      required: false,
      min: 0
    },
    weightSlabs: [
      {
        minWeight: {
          type: Number,
          required: true,
        },
        maxWeight: {
          type: Number,
          required: true,
        },
        feeValue: {
          type: Number,
          required: false,
        },
        charge: {
          type: Number,
          required: false,
        },
        status: {
          type: Boolean,
          default: true,
        },
        displayOrder: {
          type: Number,
          default: 0,
        },
      },
    ],
    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

feeSchema.pre('validate', function syncWeightSlabCharge() {
  if (Array.isArray(this.weightSlabs)) {
    this.weightSlabs.forEach((slab, index) => {
      if (slab.charge === undefined || slab.charge === null) {
        slab.charge = slab.feeValue;
      }
      if (slab.feeValue === undefined || slab.feeValue === null) {
        slab.feeValue = slab.charge;
      }
      if (slab.displayOrder === undefined || slab.displayOrder === null) {
        slab.displayOrder = index;
      }
    });
  }
});

module.exports = mongoose.model('Fee', feeSchema);
