const userModel = require("../model/user.model");
const requestModel = require("../model/requests.model");
const status = require("http-status");
const APIResponse = require("../helper/APIResponse");
const postModel = require("../model/post.model");
const notificationModel = require("../model/polyamorous/notification.model");
const chatRoomModel = require("../webSocket/models/chatRoom.model");
const { Mongoose, default: mongoose } = require("mongoose");
const { Socket } = require("socket.io");

exports.sendRequest = async (req, res, next) => {
    try {

        const checkUserExist = await userModel.findOne({ _id: req.params.user_id, polyDating: 0 });
        const checkRequestedEmail = await userModel.findOne({ _id: req.params.requested_id, polyDating: 0 })

        if (checkUserExist && checkRequestedEmail) {

            if (checkRequestedEmail) {
                const emailExitInRequestedModel = await requestModel.findOne({ userId: req.params.user_id })

                const emailExitInRequestedModel1 = await requestModel.findOne({ userId: req.params.requested_id })


                if (!emailExitInRequestedModel) {
                    const request = requestModel({
                        userId: checkUserExist._id,
                        userEmail: checkUserExist.email,
                        RequestedEmails: [{
                            requestedEmail: checkRequestedEmail.email,
                            accepted: 2,
                            userId: checkRequestedEmail._id
                        }],

                    })

                    const saveData = await request.save();

                    const findUserInNotification = await notificationModel.findOne({
                        userId: checkRequestedEmail._id
                    })

                    if (findUserInNotification) {
                        await notificationModel.updateOne({
                            userId: checkRequestedEmail._id
                        }, {
                            $push: {
                                notifications: {
                                    notifications: `${checkUserExist.firstName} sent you a friend request.`,
                                    userId: checkUserExist._id,
                                    status: 1
                                }
                            }
                        })
                    } else {

                        const data = notificationModel({
                            userId: checkRequestedEmail._id,
                            notifications: {
                                notifications: `${checkUserExist.firstName} sent you a friend request.`,
                                userId: checkUserExist._id,
                                status: 1
                            }
                        })

                        await data.save();
                    }



                    if (!emailExitInRequestedModel1) {



                        const request = requestModel({
                            userId: checkRequestedEmail._id,
                            userEmail: checkRequestedEmail.email,
                            RequestedEmails: [{
                                requestedEmail: checkUserExist.email,
                                accepted: 4,
                                userId: checkUserExist._id
                            }],

                        })

                        const saveData = await request.save();



                    } else {


                        const inRequested = [];
                        const allRequestedEmail = emailExitInRequestedModel1.RequestedEmails
                        allRequestedEmail.map((result, index) => {

                            if (result.requestedEmail == checkUserExist.email) {
                                inRequested.push(true)
                            }
                        })
                        if (inRequested[0] == true) {

                        } else {
                            const updatePosts = await requestModel.updateOne({ userId: emailExitInRequestedModel1.userId },
                                {
                                    $push: {
                                        RequestedEmails: [{
                                            requestedEmail: checkUserExist.email,
                                            accepted: 4,
                                            userId: checkUserExist._id
                                        }]
                                    }
                                })
                        }

                    }

                    res.status(status.CREATED).json(
                        new APIResponse("Request Send successfully!", "true", 201, "1")
                    )

                } else {
                    const inRequested = [];
                    const allRequestedEmail = emailExitInRequestedModel.RequestedEmails
                    allRequestedEmail.map((result, index) => {

                        if (result.requestedEmail == checkRequestedEmail.email) {
                            inRequested.push(true)
                        }
                    })

                    if (!emailExitInRequestedModel1) {

                        const request = requestModel({
                            userId: checkRequestedEmail._id,
                            userEmail: checkRequestedEmail.email,
                            RequestedEmails: [{
                                requestedEmail: checkUserExist.email,
                                accepted: 4,
                                userId: checkUserExist._id
                            }],
                        })

                        const saveData = await request.save();

                    } else {
                        const inRequested = [];

                        const allRequestedEmail = emailExitInRequestedModel1.RequestedEmails
                        allRequestedEmail.map((result, index) => {

                            if (result.requestedEmail == checkUserExist.email) {
                                inRequested.push(true)
                            }
                        })
                        if (inRequested[0] == true) {

                        } else {
                            const updatePosts = await requestModel.updateOne({ userId: emailExitInRequestedModel1.userId },
                                {
                                    $push: {
                                        RequestedEmails: [{
                                            requestedEmail: checkUserExist.email,
                                            accepted: 4,
                                            userId: checkUserExist._id
                                        }]
                                    }
                                })
                        }

                    }
                    if (inRequested[0] == true) {
                        res.status(status.ALREADY_REPORTED).json(
                            new APIResponse("Already requesed!", "false", 208, "0")
                        )
                    } else {
                        const updatePosts = await requestModel.updateOne({ userId: req.params.user_id },
                            {
                                $push: {
                                    RequestedEmails: [{
                                        requestedEmail: checkRequestedEmail.email,
                                        accepted: 2,
                                        userId: checkRequestedEmail._id
                                    }]
                                }
                            })
                        const findUserInNotification = await notificationModel.findOne({
                            userId: checkRequestedEmail._id
                        })
                        if (findUserInNotification) {
                            await notificationModel.updateOne({
                                userId: checkRequestedEmail._id
                            }, {
                                $push: {
                                    notifications: {
                                        notifications: `${checkUserExist.firstName} sent you a friend request.`,
                                        userId: checkUserExist._id,
                                        status: 1
                                    }
                                }
                            })
                        } else {
                            const data = notificationModel({
                                userId: checkRequestedEmail._id,
                                notifications: {
                                    notifications: `${checkUserExist.firstName} sent you a friend request.`,
                                    userId: checkUserExist._id,
                                    status: 1
                                }
                            })

                            await data.save();
                        }

                        res.status(status.CREATED).json(
                            new APIResponse("Request Send successfully!", "true", 201, "1")
                        )
                    }

                }

            } else {


            }
        } else {

            res.status(status.NOT_FOUND).json(
                new APIResponse("not found", "false", 404, "0")
            )

        }

    } catch (error) {
        console.log("Error:", error);
        res.status(status.INTERNAL_SERVER_ERROR).json(
            new APIResponse("Something Went Wrong", "false", 500, "0", error.message)
        )
    }
}


exports.getUserWithFriend = async (req, res, next) => {
    try {

        const user_id = req.params.user_id;
        const request_user_id = req.params.request_user_id;

        const findUser = await userModel.findOne({
            _id: req.params.user_id,
            polyDating: 0
        })

        if (findUser == null) {
            res.status(status.NOT_FOUND).json(
                new APIResponse("user not Found and not Social Meida & Dating type user", "false", 404, "0")
            )
        } else {
            const reaquestedAllEmail = [];
            const allMeargeData = [];


            const requestEmail = await requestModel.findOne({
                userId: req.params.req_user_id
            })



            if (requestEmail) {
                for (const allRequestEmail of requestEmail.RequestedEmails) {

                    // console.log("allRequestEmail", allRequestEmail);

                    if (allRequestEmail) {

                        if ((allRequestEmail.userId).toString() == (req.params.user_id).toString()) {

                        } else {
                            reaquestedAllEmail.push((allRequestEmail.userId).toString())
                        }

                    } else {
                        reaquestedAllEmail.push()
                    }
                }
            } else {
                reaquestedAllEmail.push()
            }

            if (reaquestedAllEmail[0] == undefined) {
                res.status(status.OK).json(
                    new APIResponse("no friend", 'true', 201, '1', [])
                )
            } else {

                const RequestedEmailExiestInUser = await requestModel.findOne(
                    {
                        userId: req.params.user_id,
                        RequestedEmails: {
                            $elemMatch: {
                                userId: {
                                    $in: reaquestedAllEmail
                                }
                            }
                        }
                    }
                )

                if (reaquestedAllEmail && RequestedEmailExiestInUser == null) {
                    const finalData = [];
                    const responseData = [];
                    for (const allrequestedDataNotAcceptedRequestAndNotFriend of reaquestedAllEmail) {
                        const userDetail = await userModel.findOne({ _id: allrequestedDataNotAcceptedRequestAndNotFriend });
                        finalData.push(userDetail)
                    }



                    for (const getOriginalData of finalData) {


                        const response = {
                            _id: getOriginalData._id,
                            email: getOriginalData.email,
                            profile: getOriginalData.photo[0] ? getOriginalData.photo[0].res : "",
                            firstName: getOriginalData.firstName,
                            status: 3,
                        }


                        responseData.push(response);

                    }

                    const page = parseInt(req.query.page)
                    const limit = parseInt(req.query.limit)
                    const startIndex = (page - 1) * limit;
                    const endIndex = page * limit;
                    let uniqueObjArray = [...new Map(responseData.map((item) => [item["_id"], item])).values()];
                    const data = uniqueObjArray.length;
                    const pageCount = Math.ceil(data / limit);

                    res.status(status.OK).json({
                        "message": "show all friend record",
                        "status": true,
                        "code": 201,
                        "statusCode": 1,
                        "pageCount": (pageCount).toString() == (NaN).toString() ? 0 : pageCount,
                        "data": (page).toString() == (NaN).toString() ? uniqueObjArray : uniqueObjArray.slice(startIndex, endIndex)

                    })

                } else {

                    const emailGet = [];
                    const finalData = [];
                    for (const getEmail of RequestedEmailExiestInUser.RequestedEmails) {
                        emailGet.push((getEmail.userId).toString())
                    }

                    var difference = reaquestedAllEmail.filter(x => emailGet.indexOf(x) === -1);
                    const UniqueEmail = [];


                    for (const uniqueEmail of difference) {
                        const userDetail = await userModel.findOne({ _id: uniqueEmail });
                        finalData.push(userDetail)
                    }

                    for (const getOriginalData of finalData) {

                        // const response = {
                        //     _id: getOriginalData._id,
                        //     email: getOriginalData.email,
                        //     firstName: getOriginalData.firstName,
                        //     profile: getOriginalData.photo[0] ? getOriginalData.photo[0].res : "",
                        //     status: 3,

                        // }

                        // UniqueEmail.push(response);
                    }


                    const statusByEmail = [];
                    const allRequestedEmail = RequestedEmailExiestInUser.RequestedEmails
                    const requestedEmailWitchIsInuserRequeted = [];
                    allRequestedEmail.map((result, next) => {
                        const resultEmail = result.userId
                        requestedEmailWitchIsInuserRequeted.push(resultEmail);
                    })

                    const meageAllTable = await userModel.aggregate([{
                        $match: {
                            _id: {
                                $in: requestedEmailWitchIsInuserRequeted
                            }
                        }
                    },
                    {
                        $lookup: {
                            from: 'posts',
                            localField: '_id',
                            foreignField: 'userId',
                            as: 'req_data'
                        }
                    },
                    {
                        $lookup: {
                            from: 'requests',
                            let: {
                                userId: mongoose.Types.ObjectId(req.params.user_id),
                                id: "$_id"
                            },
                            pipeline: [
                                {
                                    $match: {
                                        $expr: {
                                            $and: [
                                                {
                                                    $eq: [
                                                        "$userId", "$$userId"
                                                    ]
                                                },
                                                {
                                                    $in:
                                                        [
                                                            "$$id", "$RequestedEmails.userId"
                                                        ]
                                                }
                                            ]
                                        }
                                    }
                                },
                            ],
                            as: 'form_data'
                        }
                    },
                    {
                        $project: {
                            polyDating: "$polyDating",
                            HowDoYouPoly: "$HowDoYouPoly",
                            loveToGive: "$loveToGive",
                            polyRelationship: "$polyRelationship",
                            firstName: "$firstName",
                            email: "$email",
                            firstName: "$firstName",
                            relationshipSatus: "$relationshipSatus",
                            Bio: "$Bio",
                            photo: "$photo",
                            hopingToFind: "$hopingToFind",
                            jobTitle: "$jobTitle",
                            wantChildren: "$wantChildren",
                            posts: "$req_data",
                            result: "$form_data.RequestedEmails",
                        }
                    }])



                    const finalExistUser = [];



                    const emailDataDetail = meageAllTable;
                    for (const DataDetail of emailDataDetail) {

                        for (const reqEmail of reaquestedAllEmail) {
                            if ((DataDetail._id).toString() == (reqEmail).toString()) {
                                finalExistUser.push(DataDetail)
                            }
                        }
                    }

                    for (const emailData of finalExistUser[0].result) {

                        for (const requestEmail of emailData) {

                            for (const meageAllTableEmail of finalExistUser) {

                                if ((requestEmail.userId).toString() == (meageAllTableEmail._id).toString()) {

                                    const user = await userModel.findOne({
                                        _id: req.params.req_user_id,
                                        polyDating: 0
                                    })

                                    if (requestEmail.accepted == 1) {
                                        var status1 = {
                                            _id: requestEmail.userId,
                                            status: requestEmail.accepted,
                                            email: requestEmail.requestedEmail,
                                            firstName: user.firstName,
                                            profile: user.photo[0] ? user.photo[0].res : "",

                                        }
                                        statusByEmail.push(status1)
                                    } else if (requestEmail.accepted == 4) {
                                        var status2 = {
                                            _id: requestEmail.userId,
                                            status: requestEmail.accepted,
                                            email: requestEmail.requestedEmail,
                                            firstName: user.firstName,
                                            profile: user.photo[0] ? user.photo[0].res : "",
                                        }
                                        statusByEmail.push(status2)
                                    } else {
                                        var status3 = {
                                            _id: requestEmail.userId,
                                            status: requestEmail.accepted,
                                            email: requestEmail.requestedEmail,
                                            firstName: user.firstName,
                                            profile: user.photo[0] ? user.photo[0].res : "",

                                        }
                                        statusByEmail.push(status3)
                                    }

                                }
                            }
                        }
                    }

                    const final_data = [];

                    const finalStatus = []
                    for (const [key, finalData] of meageAllTable.entries()) {


                        for (const [key, final1Data] of statusByEmail.entries())
                            if ((finalData._id).toString() === (final1Data._id).toString()) {
                                const response = {
                                    status: final1Data.status
                                }
                                finalStatus.push(response)
                            }
                    }
                    for (const [key, finalData] of finalExistUser.entries()) {

                        const findAllUserWithIchat1 = await chatRoomModel.findOne({
                            $and: [{
                                user1: finalData._id
                            }, {
                                user2: req.params.user_id
                            }]
                        })

                        const findAllUserWithIchat2 = await chatRoomModel.findOne({
                            $and: [{
                                user1: req.params.user_id
                            }, {
                                user2: finalData._id
                            }]
                        })

                        if (findAllUserWithIchat1) {

                            if (finalStatus[key].status == 1) {
                                // const responses = {
                                //     _id: finalData._id,
                                //     // polyDating: finalData.polyDating,
                                //     // HowDoYouPoly: finalData.HowDoYouPoly,
                                //     // loveToGive: finalData.loveToGive,
                                //     // polyRelationship: finalData.polyRelationship,
                                //     firstName: finalData.firstName,
                                //     email: finalData.email,
                                //     profile: finalData.photo[0] ? finalData.photo[0].res : "",
                                //     // relationshipSatus: finalData.relationshipSatus,
                                //     // Bio: finalData.Bio,
                                //     // hopingToFind: finalData.hopingToFind,
                                //     // jobTitle: finalData.jobTitle,
                                //     // wantChildren: finalData.wantChildren,
                                //     // posts_data: finalData.posts,
                                //     statusAndTumbCount: finalStatus[key]
                                // }
                                // const response = {
                                //     _id: finalData._id,
                                //     // polyDating: finalData.polyDating,
                                //     // HowDoYouPoly: finalData.HowDoYouPoly,
                                //     // loveToGive: finalData.loveToGive,
                                //     // polyRelationship: finalData.polyRelationship,
                                //     firstName: finalData.firstName,
                                //     email: finalData.email,
                                //     profile: finalData.photo[0] ? finalData.photo[0].res : "",
                                //     // relationshipSatus: finalData.relationshipSatus,
                                //     // Bio: finalData.Bio,
                                //     // hopingToFind: finalData.hopingToFind,
                                //     // jobTitle: finalData.jobTitle,
                                //     // wantChildren: finalData.wantChildren,
                                //     // posts_data: finalData.posts,
                                //     status: responses.statusAndTumbCount.status,

                                // }
                                // final_data.push(response);

                                const responses = {
                                    _id: finalData._id,
                                    chatRoomId: findAllUserWithIchat1 ? findAllUserWithIchat1._id : "",
                                    // polyDating: finalData.polyDating,
                                    // HowDoYouPoly: finalData.HowDoYouPoly,
                                    // loveToGive: finalData.loveToGive,
                                    // polyRelationship: finalData.polyRelationship,
                                    firstName: finalData.firstName,
                                    email: finalData.email,
                                    profile: finalData.photo[0] ? finalData.photo[0].res : "",
                                    // relationshipSatus: finalData.relationshipSatus,
                                    // Bio: finalData.Bio,
                                    // hopingToFind: finalData.hopingToFind,
                                    // jobTitle: finalData.jobTitle,
                                    // wantChildren: finalData.wantChildren,
                                    // posts_data: finalData.posts,
                                    statusAndTumbCount: finalStatus[key]
                                }
                                const response = {
                                    _id: finalData._id,
                                    chatRoomId: responses.chatRoomId,
                                    // polyDating: finalData.polyDating,
                                    // HowDoYouPoly: finalData.HowDoYouPoly,
                                    // loveToGive: finalData.loveToGive,
                                    // polyRelationship: finalData.polyRelationship,
                                    firstName: finalData.firstName,
                                    email: finalData.email,
                                    profile: finalData.photo[0] ? finalData.photo[0].res : "",
                                    // relationshipSatus: finalData.relationshipSatus,
                                    // Bio: finalData.Bio,
                                    // hopingToFind: finalData.hopingToFind,
                                    // jobTitle: finalData.jobTitle,
                                    // wantChildren: finalData.wantChildren,
                                    // posts_data: finalData.posts,
                                    status: responses.statusAndTumbCount.status,
                                }

                                final_data.push(response);
                            } else {

                            }



                        } else {

                            if (finalStatus[key].status == 1) {
                                // const responses = {
                                //     _id: finalData._id,
                                //     // polyDating: finalData.polyDating,
                                //     // HowDoYouPoly: finalData.HowDoYouPoly,
                                //     // loveToGive: finalData.loveToGive,
                                //     // polyRelationship: finalData.polyRelationship,
                                //     firstName: finalData.firstName,
                                //     email: finalData.email,
                                //     profile: finalData.photo[0] ? finalData.photo[0].res : "",
                                //     // relationshipSatus: finalData.relationshipSatus,
                                //     // Bio: finalData.Bio,
                                //     // hopingToFind: finalData.hopingToFind,
                                //     // jobTitle: finalData.jobTitle,
                                //     // wantChildren: finalData.wantChildren,
                                //     // posts_data: finalData.posts,
                                //     statusAndTumbCount: finalStatus[key]
                                // }
                                // const response = {
                                //     _id: finalData._id,
                                //     // polyDating: finalData.polyDating,
                                //     // HowDoYouPoly: finalData.HowDoYouPoly,
                                //     // loveToGive: finalData.loveToGive,
                                //     // polyRelationship: finalData.polyRelationship,
                                //     firstName: finalData.firstName,
                                //     email: finalData.email,
                                //     profile: finalData.photo[0] ? finalData.photo[0].res : "",
                                //     // relationshipSatus: finalData.relationshipSatus,
                                //     // Bio: finalData.Bio,
                                //     // hopingToFind: finalData.hopingToFind,
                                //     // jobTitle: finalData.jobTitle,
                                //     // wantChildren: finalData.wantChildren,
                                //     // posts_data: finalData.posts,
                                //     status: responses.statusAndTumbCount.status,

                                // }

                                // final_data.push(response);

                                const responses = {
                                    _id: finalData._id,
                                    chatRoomId: findAllUserWithIchat2 ? findAllUserWithIchat2._id : "",
                                    // polyDating: finalData.polyDating,
                                    // HowDoYouPoly: finalData.HowDoYouPoly,
                                    // loveToGive: finalData.loveToGive,
                                    // polyRelationship: finalData.polyRelationship,
                                    firstName: finalData.firstName,
                                    email: finalData.email,
                                    profile: finalData.photo[0] ? finalData.photo[0].res : "",
                                    // relationshipSatus: finalData.relationshipSatus,
                                    // Bio: finalData.Bio,
                                    // hopingToFind: finalData.hopingToFind,
                                    // jobTitle: finalData.jobTitle,
                                    // wantChildren: finalData.wantChildren,
                                    // posts_data: finalData.posts,
                                    statusAndTumbCount: finalStatus[key]
                                }
                                const response = {
                                    _id: finalData._id,
                                    chatRoomId: responses.chatRoomId,
                                    // polyDating: finalData.polyDating,
                                    // HowDoYouPoly: finalData.HowDoYouPoly,
                                    // loveToGive: finalData.loveToGive,
                                    // polyRelationship: finalData.polyRelationship,
                                    firstName: finalData.firstName,
                                    email: finalData.email,
                                    profile: finalData.photo[0] ? finalData.photo[0].res : "",
                                    // relationshipSatus: finalData.relationshipSatus,
                                    // Bio: finalData.Bio,
                                    // hopingToFind: finalData.hopingToFind,
                                    // jobTitle: finalData.jobTitle,
                                    // wantChildren: finalData.wantChildren,
                                    // posts_data: finalData.posts,
                                    status: responses.statusAndTumbCount.status,
                                }

                                final_data.push(response);
                            } else {

                            }

                        }

                    }



                    const final_response = [...final_data, ...UniqueEmail]



                    const page = parseInt(req.query.page)
                    const limit = parseInt(req.query.limit)
                    const startIndex = (page - 1) * limit;
                    const endIndex = page * limit;
                    let uniqueObjArray = [...new Map(final_response.map((item) => [item["_id"], item])).values()];
                    const data = uniqueObjArray.length;
                    const pageCount = Math.ceil(data / limit);

                    res.status(status.OK).json({
                        "message": "show all friend record",
                        "status": true,
                        "code": 201,
                        "statusCode": 1,
                        "pageCount": (pageCount).toString() == (NaN).toString() ? 0 : pageCount,
                        "data": (page).toString() == (NaN).toString() ? uniqueObjArray : uniqueObjArray.slice(startIndex, endIndex)

                    })
                }
            }
        }

    } catch (error) {
        console.log("error", error);
        res.status(status.INTERNAL_SERVER_ERROR).json(
            new APIResponse("Something Went Wrong", "false", 500, "0", error.message)
        )
    }
}

exports.getRequestUserWise = async (req, res, next) => {
    try {
        const allNotAcceptedRequestes = [];
        const findUserInRequestModel = await requestModel.findOne({ userId: req.params.user_id });
        if (findUserInRequestModel == null) {
            res.status(status.NOT_FOUND).json(
                new APIResponse("User Not Found!", "false", 404, "0")
            )
        } else {
            const RequestEmail = findUserInRequestModel.RequestedEmails;
            const Requests = [];
            for (const allRequestEmail of RequestEmail) {
                const finalResponse = {
                    userId: allRequestEmail.userId,
                    accepted: allRequestEmail.accepted
                }
                Requests.push(finalResponse)
            }

            for (const notAcceptedRequest of Requests) {
                const userDeatil = await userModel.findOne({
                    _id: notAcceptedRequest.userId
                });

                if (notAcceptedRequest.accepted == 2) {
                    const response = {
                        id: userDeatil._id,
                        requestUser: userDeatil.email,
                        name: userDeatil.firstName,
                        profile: userDeatil.photo ? userDeatil.photo[0].res : ""
                    }
                    allNotAcceptedRequestes.push(response)
                }
            }

            if (allNotAcceptedRequestes[0] == undefined) {
                res.status(status.NOT_FOUND).json(
                    new APIResponse("Not Have any requested User!", "false", 404, "0")
                )
            } else {
                res.status(status.CREATED).json(
                    new APIResponse("All Reuested User", "true", 200, "1", allNotAcceptedRequestes)
                )
            }

        }


    } catch (error) {
        console.log("Error:", error);
        res.status(status.INTERNAL_SERVER_ERROR).json(
            new APIResponse("Something Went Wrong", "false", 500, "0", error.message)
        )
    }
}

exports.userAcceptedRequesteOrNot = async (req, res, next) => {
    try {
        const reqestId = req.params.id;

        const checkRequestEmail = await requestModel.findOne({ userId: req.params.user_id, "RequestedEmails.userId": reqestId });

        if (!checkRequestEmail) {
            res.status(status.NOT_FOUND).json(
                new APIResponse("Request Not Found", "false", 404, "0")
            )
        } else {

            if (req.body.accepted == 1) {
                const updatePosts = await requestModel.updateOne({ userId: req.params.user_id, "RequestedEmails.userId": reqestId },
                    {
                        $set: {
                            "RequestedEmails.$.accepted": req.body.accepted
                        }
                    })
                const updatePosts1 = await requestModel.updateOne({ userId: reqestId, "RequestedEmails.userId": req.params.user_id },
                    {
                        $set: {
                            "RequestedEmails.$.accepted": req.body.accepted
                        }
                    })


                const addChat = chatRoomModel({
                    user1: req.params.user_id,
                    user2: reqestId
                })

                await addChat.save()

                const findUserWhichAcceptRequest = await userModel.findOne({
                    _id: req.params.user_id
                })

                const findUser = await userModel.findOne({
                    _id: reqestId
                })

                const findUser1InNotiofication = await notificationModel.findOne({
                    userId: findUserWhichAcceptRequest._id
                })
                const findUserInNotiofication = await notificationModel.findOne({
                    userId: findUser._id
                })

                await notificationModel.updateOne({
                    userId: req.params.user_id
                }, {
                    $pull: {
                        notifications: {
                            userId: req.params.id,
                            status: 1
                        }
                    }
                })

                if (findUserInNotiofication) {
                    await notificationModel.updateOne({
                        userId: findUser._id
                    }, {
                        $push: {
                            notifications: {
                                notifications: `${findUserWhichAcceptRequest.firstName} accepted your request`,
                                userId: findUserWhichAcceptRequest._id,
                                status: 2
                            }
                        }
                    })
                } else {
                    const data = notificationModel({
                        userId: findUser._id,
                        notifications: {
                            notifications: `${findUserWhichAcceptRequest.firstName} accepted your request`,
                            userId: findUserWhichAcceptRequest._id,
                            status: 2
                        }
                    })

                    await data.save();
                }

                if (findUser1InNotiofication) {
                    await notificationModel.updateOne({
                        userId: findUserWhichAcceptRequest._id
                    }, {
                        $push: {
                            notifications: {
                                notifications: `${findUser.firstName}, ${findUserWhichAcceptRequest.firstName} are friends now!`,
                                userId: findUser._id,
                                status: 2
                            }
                        }
                    })
                } else {
                    const data = notificationModel({
                        userId: findUser._id,
                        notifications: {
                            notifications: `${findUser.firstName}, ${findUserWhichAcceptRequest.firstName} are friends now!`,
                            userId: findUser._id,
                            status: 2
                        }
                    })

                    await data.save();
                }



                res.status(status.OK).json(
                    new APIResponse("request accepted successfully!", "true", 200, "1")
                )
            } else {

                const updatePosts = await requestModel.updateOne(
                    { userId: req.params.user_id },
                    {
                        $pull: {
                            RequestedEmails: {
                                userId: reqestId,
                            }
                        }
                    })

                const updatePosts1 = await requestModel.updateOne({ userId: reqestId },
                    {
                        $pull: {
                            RequestedEmails: {
                                userId: req.params.user_id,
                            }
                        }
                    })


                await notificationModel.updateOne({
                    userId: req.params.id,

                }, {
                    $pull: {
                        notifications: {
                            userId: req.params.user_id,
                            status: 1
                        }
                    }
                })


                const findUserWhichAcceptRequest = await userModel.findOne({
                    _id: req.params.user_id
                })


                res.status(status.OK).json(
                    new APIResponse("request rejected successfully!", "true", 200, "1")
                )
            }

        }

    } catch (error) {
        console.log("Error:", error);
        res.status(status.INTERNAL_SERVER_ERROR).json(
            new APIResponse("Something Went Wrong", "false", 500, "0", error.message)
        )
    }
}

// exports.showPostsOnalyAcceptedPerson = async (req, res, next) => {
//     try {

//         const userFoundOrNot = await requestModel.findOne({ userEmail: req.params.user_email })
//         if (userFoundOrNot) {
//             const acceptedOrNot = await requestModel.find({ RequestedEmails: { $elemMatch: { requestedEmail: req.params.requested_email, accepted: 1 } } });

//             if (acceptedOrNot[0] == undefined) {
//                 res.status(status.NOT_FOUND).json(
//                     new APIResponse("User not Found or Requested Email Not Found which is Accepted by user!", "false", 404, "0")
//                 )
//             } else {

//                 const getAllPostData = await postModel.aggregate([
//                     {
//                         $match: {
//                             email: req.params.requested_email
//                         }
//                     }])

//                 const showPost = getAllPostData;

//                 if (true) {
//                     const finalShowPost = [];
//                     showPost.map((result, index) => {
//                         finalShowPost.push(result)
//                     })

//                     if (finalShowPost[0] == undefined) {
//                         res.status(status.NOT_FOUND).json(
//                             new APIResponse("User not Posted Anything", "false", 404, "0")
//                         )
//                     } else {
//                         res.status(status.OK).json(
//                             new APIResponse("Show All posts", "true", 200, "1", finalShowPost)
//                         )
//                     }
//                 }

//             }

//         } else {
//             res.status(status.NOT_FOUND).json(
//                 new APIResponse("User Not Found!", "false", 404, "0")
//             )
//         }

//     } catch (error) {
//         console.log("Error:", error);
//         res.status(status.INTERNAL_SERVER_ERROR).json(
//             new APIResponse("Something Went Wrong", "false", 500, "0", error.message)
//         )
//     }
// }
