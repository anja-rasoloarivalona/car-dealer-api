const Product = require('../models/product');
const mongoose = require('mongoose');
const User = require('../models/user')
const timeStampGenerator = require('../utilities/timeStampGenerator')

exports.initAppDatas = (req, res, next) => {
    
    let publicityProducts = [];
    let homeInventoryProducts = [];
    let mostPopularProducts = [];

    let brandAndModelsData = {};
    let keys = []

    Product
      .find()
      .select('general')
      .sort({'general.viewCounter': -1})
      .then(products => {

        mostPopularProducts = products.slice(0, 4)

        products.forEach(product => {

            if(product.general.publicity){
                publicityProducts.push(product)
            }

            if(product.general.homePage){
                homeInventoryProducts.push(product)
            }

            let brand = product.general.brand
            let model  = product.general.model
            let price = product.general.price

            let modelsData = {
                [model]: {
                    min: price,
                    max: price
                }
            }
     
            if(!Object.keys(brandAndModelsData).includes(brand)){

                //Add a new brand array in the keys array
                brandAndModelsData = {
                    ...brandAndModelsData,
                    [brand]: {
                        price: {
                            min: price,
                            max: price
                        },
                        datas: {
                            ...modelsData
                        }
                    }
                }
                keys = Object.keys(brandAndModelsData)

            } else {
                //brand array already exist so we have 2 possiblities
            
                if(brandAndModelsData[brand].datas[model] !== undefined){
                     //1st case : the brand array already contains the model of the current product
                    let modelPrice = brandAndModelsData[brand].datas[model];

                    if(modelPrice.min > price){
                    
                        brandAndModelsData[brand].datas[model].min = price
                    }

                    if(modelPrice.max < price){
                        brandAndModelsData[brand].datas[model].max = price
                    }


                } else {
                    //2nd case : the brand array doesn't contain the model of the current product
                    brandAndModelsData = {
                        ...brandAndModelsData,
                        [brand]:{
                            ...brandAndModelsData[brand],
                            datas: {
                                ...brandAndModelsData[brand].datas,
                                ...modelsData
                            }        
                        }
                    }
                }
            }

            if(brandAndModelsData[brand].price.min > price){
                brandAndModelsData[brand].price.min = price
            }

            if(brandAndModelsData[brand].price.max < price){
                brandAndModelsData[brand].price.max = price
            }
           
        })
        res
            .status(200)
            .json({ message: 'Fetched user products', 
                publicityProducts: publicityProducts,
                homeInventoryProducts: homeInventoryProducts,
                brandAndModelsData: brandAndModelsData,
                mostPopularProducts: mostPopularProducts})
        })
        .catch(err => {
            console.log(err)
        })
        
}

exports.getProductsAsClient = (req, res, next ) => {
    let brandQueries = [],
        priceQueries,
        yearQueries,
        supplierQuery

    if(req.query.price === 'undefined' || req.query.price === undefined){
        priceQueries = {"general.price" : { $ne: null}}
    } else {
        let minPrice = req.query.price.split(':')[0]
        let maxPrice = req.query.price.split(':')[1];
        priceQueries={ "general.price" : { $gte: minPrice, $lte: maxPrice} }
    }


    if(req.query.year === 'undefined' || req.query.year === undefined){
        yearQueries = {"general.year" : { $ne: null}}
    } else {
        let minYear = req.query.year.split(':')[0]
        let maxYear = req.query.year.split(':')[1];
        yearQueries ={ "general.year" : { $gte: minYear, $lte: maxYear} }
    }

    const { supplier } = req.query;   
    if(supplier === 'undefined' || supplier === undefined || supplier === 'null' || supplier === 'all'){
        supplierQuery = {'supplier.info' : {$ne: null}}
    } else {
        supplierQuery = {'supplier.info' : supplier}
    }
    

    let brands
    let datas = {};

    if(req.query.brand === 'undefined' || req.query.brand === undefined || req.query.brand === 'all'){
        brandQueries = [{ "general.brand" : { $ne: null}}]
    } else {
        brands = req.query.brand.split('_');

        brands.forEach( i => {
            if(i !== ''){        
                let brand = i.split(':')[0]
                let brandData = i.split(':')[1].split(',')
    
                datas[brand] = brandData
            }
        })

        Object.keys(datas).map( brand => {
            datas[brand].forEach(model => {
                let sort; 
                if(model !== 'all'){
                    sort = {
                        "general.brand": brand,
                        "general.model": model
                    }
                } else {
                    sort = {
                        "general.brand": brand,
                    }
                }
                brandQueries = [...brandQueries, sort]
            })
            
        })
    }


    const { sortBy } = req.query;
    let sort;
    if(sortBy === 'undefined' ||sortBy === 'prix_croissant' ){
        sort = {"general.price": 1};
    }
    if(sortBy === 'prix_décroissant'){
        sort = {"general.price": -1};
    }
    if(sortBy === 'popularité'){
        sort = {"general.viewCounter": -1};
    }
    if(sortBy === 'date'){
        sort = {createdAt: -1};
    }

    Product
        .find({ 
            $and: [
               {$or: brandQueries},
                priceQueries,
                yearQueries,
                supplierQuery
            ]
        })
       .select('general _id createdAt supplier followers')
        .sort(sort)
        .populate('supplier.info')
        .exec()      
        .then(products => {
            res
                .status(200)
                .json({ message: 'Products feteched', 
                        products: products,
                    })
        })
        .catch( err => {
            console.log(err)
        })
}

exports.getProductsAsAdmin = (req, res, next ) => {
    let brandQueries,
        priceMinQueries,
        priceMaxQueries,
        minYearQueries,
        maxYearQueries,
        modelQueries,
        supplierQuery

        const currentPage = req.query.page || 1;
        const itemsPerPage = 8;


    //price

    if(req.query.priceMin === 'undefined' || req.query.priceMin === undefined){
        priceMinQueries = {"general.price" : { $ne: null}}
    } else {
        priceMinQueries = { "general.price" : { $gte: req.query.priceMin} }
    }

    if(req.query.priceMax === 'undefined' || req.query.priceMax === undefined){
        priceMaxQueries = {"general.price" : { $ne: null}}
    } else {
        priceMaxQueries = { "general.price" : { $lte: req.query.priceMax} }
    }


    //year 

    if(req.query.minYear === 'undefined' || req.query.minYear === undefined){
        minYearQueries = {"general.year" : { $ne: null}}
    } else {
        minYearQueries = { "general.year" : { $gte: req.query.minYear} }
    }

    if(req.query.maxYear === 'undefined' || req.query.maxYear === undefined){
        maxYearQueries = {"general.year" : { $ne: null}}
    } else {
        maxYearQueries = { "general.year" : { $lte: req.query.maxYear} }
    }

    const { supplierId } = req.query; 

    if(supplierId === 'undefined' || supplierId === undefined || supplierId === 'null' || supplierId === 'all'){
        supplierQuery = {'supplier.info' : {$ne: null}}
    } else {
        supplierQuery = {'supplier.info' : supplierId}
    }

    const {brand} = req.query;
    if(brand === 'undefined' || brand === undefined || brand === 'all'){
        brandQueries = { "general.brand" : { $ne: null}}
    } else {
        brandQueries = {'general.brand': brand}
    }

    const {model} = req.query;
    if(model === 'undefined' || model === undefined || model === 'all'){
        modelQueries = { "general.model" : { $ne: null}}
    } else {
        modelQueries = {'general.model': model}
    }


    const { sortBy } = req.query;
    let sort;
    if(sortBy === 'undefined' ||sortBy === 'increasing_price' ){
        sort = {"general.price": 1};
    }
    if(sortBy === 'decreasing_price'){
        sort = {"general.price": -1};
    }
    if(sortBy === 'latest'){
        sort = {"general.viewCounter": -1};
    }
    if(sortBy === 'most_popular'){
        sort = {createdAt: -1};
    }


    let findQuery = {
        $and: [
            brandQueries,
            modelQueries,
            priceMinQueries,
            priceMaxQueries,
            minYearQueries,
            maxYearQueries,
            supplierQuery
        ]
    }

    let totalProducts;

    Product
        .find(findQuery)
        .then(products => {
            if(!products){
                const error = new Error('No Products Found')
                error.statusCode = 404
                throw error 
            }
            totalProducts = products.length;

            return Product.find(findQuery)
                .select('general _id createdAt supplier followers')
                .sort(sort)
                .skip( (currentPage - 1) * itemsPerPage)
                .limit(itemsPerPage)
                .populate('supplier.info')
                .exec()  
        })
            
        .then(products => {
            res
                .status(200)
                .json({ message: 'Products feteched', 
                        products: products,
                        totalProducts: totalProducts
                    })
        })
        .catch( err => {
            console.log(err)
        })
}

exports.getProduct = (req, res, next) => {
    let brandRequested = 'Toyota'
    let modelRequested = 'Elantra'
    let priceRequested = 2000
    const {brand, model, price, userId} = req.query;

    let userIdMakingRequest = userId;
    let productsResponse;
    let timestamp = timeStampGenerator();


    let requestedProduct, relatedProducts;



    if(userId !== 'not connected') {
        userIdMakingRequest = mongoose.Types.ObjectId(userId)
    }

    if(brand !== 'null'){
        brandRequested = brand
    } 
    if(model !== 'null'){
        modelRequested = model
    }
    if(price !== 'null'){
        priceRequested = price
    } 

    const prodId = mongoose.Types.ObjectId(req.params.prodId);

    Product
        .find({   $or: [{_id: prodId}, {'general.brand' : brandRequested}] })
        .then(products => {       
            if(!products){
                const error = new Error('Product not found');
                error.statusCode = 404
                throw error
            }

            productsResponse = products;            
            products.forEach(product => {

              if(product._id.toString() === prodId.toString()){
                  let viewCounter = product.general.viewCounter;
                  if(viewCounter === undefined){
                     product.general.viewCounter = 1
                  } else {
                    product.general.viewCounter = product.general.viewCounter + 1
                  }

                  product.views = [...product.views, {
                      userId: userIdMakingRequest,
                      timeStamp: timestamp
                  }]

                  return product.save()
                }
            })
        })
        .then( () => {  

   
            
            let favorite = false;

           requestedProduct = productsResponse.find(product => product._id.toString() === prodId.toString())
           relatedProducts = productsResponse.filter(product => product._id.toString() !== prodId.toString())

           if(userId!== 'not connected' && requestedProduct.followers.includes(userId)){
            favorite = true
            }


            res.status(200).json({
                message: 'Product fetched',
                product: requestedProduct,
                relatedProducts: relatedProducts,
                favorite: favorite
            })

            if(userId !== 'not connected'){
                addingViewsToUser(userIdMakingRequest, prodId, timestamp);
            }           

        })           
        .catch(err => {
            console.log(err)
        })
}



const addingViewsToUser = (userId, prodId, timeStamp) => {
    User.findById(userId)
        .then(user => {

            if(user.views.length > 0){ 
                // We already have views data

                //Find if the current product is already in the data set
                let currentViewedProduct = user.views.find(view => view.productId.toString() === prodId.toString())

                if(!currentViewedProduct){
                    //The current product is not in the data set
                    user.views = [
                        ...user.views,
                        {
                            productId: prodId,
                            times: [timeStamp],
                            counter: 1
                        }
                    ]
                } else {
                    //the current product is in the data set
                    user.views.forEach(view => {
                        if(view.productId.toString() === prodId.toString()){
                            view.times.push(timeStamp)
                            view.counter = view.counter + 1
                        }
                    })
                }
            } else {
                //No views data yet
                user.views = [
                    {
                        productId: prodId,
                        times: [timeStamp],
                        counter: 1
                    }
                ]
            }

            return user.save()
        })
        .catch(err => {
            console.log(err)
        })
}


