const express = require('express');

const adminController = require('../controllers/admin');

const router = express.Router();


router.get('/products', adminController.getProducts);

router.get('/:prodId', adminController.getProduct)

router.post('/add-product', adminController.addProduct);

router.put('/edit-product', adminController.updateProduct)


module.exports = router;




