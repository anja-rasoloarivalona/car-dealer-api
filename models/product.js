const mongoose = require('mongoose');
const Schema = mongoose.Schema;


const productSchema = new Schema({

    general: {
        title: {
            type: String,
            //required: true
        },
        
        brand: {
            type: String,
            //required: true
        },

        model: {
            type: String,
            //required: true
        },

        year: {
            type: String,
            //required: true
        },

        price: {
            type: Number,
            //required: true
        },
        bodyType: {
            type: String
        },
        nbKilometers: Number,
        gazol: String,
        yearOfRelease: String,
        transmissionType: String,
        nbOwners: Number,
        serialNumber: String,
        generalState: String,
        mainImgUrl: String,
        publicity: Boolean,
        homePage: Boolean,
        viewCounter: Number
    
    },


    tech: {
        nbGearRatios: Number,
        nbCylinders: Number,
        motorSize: String,
        maxSpeed: String
    },

    design: {
        intColor: String,
        extColor: String
    },

    features: [{
        type: String
    }],

    albumId: String,
    imageUrls: [{
        type: String
    }],

    supplier: {
        info: {
            type: Schema.Types.ObjectId,
            ref: 'Supplier'
        },
        reference: String,
        price: Number
    },

    views: [{
        userId: String,
        timeStamp: String
    }],

    followers: [{
        type: String
    }],
    followersCounter: Number

   
}, {timestamps: true})


/*productSchema.methods.getName = () => {

}*/



module.exports = mongoose.model('Product', productSchema)