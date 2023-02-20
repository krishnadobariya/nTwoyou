const express = require("express");
const router = express.Router();

const upload = require('../utils/multer.userImages.utils');

const userController = require("../controller/user.controller");

router.post('/register', upload.fields([{
    name: "photo",
    maxCount: 10
}, {
    name: "profile",
    maxCount: 1
}]), userController.userRegister);
router.post('/login', userController.userLogin);
router.post('/update/:user_id', upload.fields([{
    name: "photo",
    maxCount: 10
},
    // {
    //     name: "profile",
    //     maxCount: 1
    // }
]), userController.userUpdate);
router.put('/update/token/:user_id', userController.tokenUpdate);
router.get('/search/:user_id', userController.searchFriend);
router.get('/view/:user_id/:req_user_id', userController.getDataUserWise);
router.get('/storeBasketValue/:user_id', userController.storeBasketValue);
router.get('/yesBasket/:user_id/:request_user_id', userController.yesBasket);
router.get('/noBasket/:user_id/:request_user_id', userController.noBasket);
router.get('/moveBasket/:user_id/:request_user_id', userController.moveBasket);
router.get('/getUser/:user_id', userController.getAllUser);
router.get('/notification/:user_id', userController.getAllNotification);
router.post('/forgetPassword/:email', userController.forGetPassword);
router.get('/existMailOrNot/:email/:type', userController.checkMailExiesOrNot);
router.get('/unfriend/:user_id/:unfriend_user_id', userController.unFriend);
router.put('/notification/read/:user_id', userController.readNotification);
router.put('/logout/:user_id', userController.logout);
router.delete("/delete/:id", userController.deleteAccount)
router.post("/upload-image/:id", 
upload.fields([{
    name: "photo",
    maxCount: 10
}, {
    name: "profile",
    maxCount: 1
}]),
userController.imageUpload);

module.exports = router;