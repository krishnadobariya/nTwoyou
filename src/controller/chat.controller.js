const APIResponse = require("../helper/APIResponse");
const status = require("http-status");
const chatModels = require("../webSocket/models/chat.models");
const { default: mongoose, get } = require("mongoose");
const chatRoomModel = require("../webSocket/models/chatRoom.model");
const userModel = require("../model/user.model");
const videoCallModel = require("../webSocket/models/videoCall.model");

exports.readChat = async (req, res, next) => {
    try {
        const findRoom = await chatModels.findOne({
            chatRoomId: req.params.chat_room_id,
            "chat.sender": req.params.user_id
        })
        for (const [key, getSenderChat] of findRoom.chat.entries()) {

            if ((getSenderChat.sender).toString() == (req.params.user_id).toString()) {

                const updatePosts = await chatModels.updateOne(
                    {
                        chatRoomId: req.params.chat_room_id, chat: {
                            $elemMatch: {
                                sender: mongoose.Types.ObjectId(req.params.user_id)
                            }
                        }
                    },
                    {
                        $set: {
                            "chat.$[chat].read": 0
                        }
                    },
                    { arrayFilters: [{ 'chat.sender': mongoose.Types.ObjectId(req.params.user_id) }] })
            } else {

            }
        }

        if (findRoom == null) {
            res.status(status.NOT_FOUND).json(
                new APIResponse("User Not Found in Chat", "true", 404, "0")
            )
        } else {
            res.status(status.OK).json(
                new APIResponse("Read All chat", "true", 200, "1")
            )
        }

        // const findChatId = await chatModels.findOne({ chatRoomId: mongoose.Types.ObjectId(req.params.chat_room_id) })

        // if (findChatId == null) {
        //     res.status(status.NOT_FOUND).json(
        //         new APIResponse("User Not Found in Chat", "true", 404, "0")
        //     )

        // } else {
        //     await chatModels.updateMany({ chatRoomId: req.params.chat_room_id }, { $set: { "chat.$[].read": 0 } });

        //     res.status(status.OK).json(
        //         new APIResponse("Read updated", "true", 200, "1")
        //     )
        // }

    } catch (error) {
        console.log("Error:", error);
        res.status(status.INTERNAL_SERVER_ERROR).json(
            new APIResponse("Something Went Wrong", "false", 500, "0", error.message)
        );
    }
}


exports.getUserWithChat = async (req, res, next) => {
    try {
        const allChat = [];
        const chatRoom = [];
        const findRoom = await chatModels.findOne({
            chatRoomId: req.params.user_id
        });
        chatRoom.push(findRoom)

        const page = parseInt(req.query.page)
        const limit = parseInt(req.query.limit)
        const startIndex = (page - 1) * limit;
        const endIndex = page * limit;


        if (findRoom != null) {
            const chat = findRoom.chat;
            for (const finalchat of chat) {
                const response = {
                    _id: finalchat.sender,
                    text: finalchat.text,
                    time: finalchat.createdAt,
                    photo: finalchat.photo
                }
                allChat.push(response)
            }

            const data = allChat.length;
            const pageCount = Math.ceil(data / limit);
            res.status(status.OK).json({
                "message": "show all record with chat",
                "status": true,
                "code": 201,
                "statusCode": 1,
                "pageCount": (pageCount).toString() == (NaN).toString() ? 0 : pageCount,
                "data": (startIndex).toString() == (NaN) ? allChat : allChat.slice(startIndex, endIndex)

            })
        } else {
            res.status(status.OK).json({
                "message": "show all record with chat",
                "status": true,
                "code": 201,
                "statusCode": 1,
                "pageCount": 0,
                "data": []

            })
        }
    } catch (error) {
        console.log("Error:", error);
        res.status(status.INTERNAL_SERVER_ERROR).json(
            new APIResponse("Something Went Wrong", "false", 500, "0", error.message)
        );
    }
}

exports.allUserListWithUnreadCount = async (req, res, next) => {
    try {
        // const findData = await chatRoomModel.findOne({
        //     _id: mongoose.Types.ObjectId(req.params.chat_room),
        //     user1: mongoose.Types.ObjectId(req.params.user_1),
        //     user2: mongoose.Types.ObjectId(req.params.user_2)
        // })
        const findAllUserWithIchat = await chatRoomModel.find({
            $or: [{
                user1: req.params.user_id
            }, {
                user2: req.params.user_id
            }]
        });
        console.log("findAllUserWithIchat::", findAllUserWithIchat);

        const unReadMessage = [];
        for (const roomId of findAllUserWithIchat) {

            const findRoom = await chatModels.findOne({
                chatRoomId: roomId._id
            });

            if (findRoom) {

                const userDetail = [];
                if (roomId.user1 == req.params.user_id) {

                    const userProfile = await userModel.findOne({
                        _id: roomId.user2
                    })
                    userDetail.push(userProfile)

                } else {
                    const userProfile = await userModel.findOne({
                        _id: roomId.user1
                    })
                    userDetail.push(userProfile)
                }
                var count = 0;
                const lastMessage = [];


                for (const getChat of findRoom.chat) {


                    var s_id = (getChat.sender).toString();
                    var u_id = (req.params.user_id).toString();

                    if (s_id == u_id) {
                        count = count + getChat.read;
                    } else {

                    }

                    const lastUnreadMessage = {
                        text: getChat.text,
                        createdAt: getChat.createdAt,
                        dateAndTime: getChat.dateAndTime
                    }


                    lastMessage.push(lastUnreadMessage);
                    const lastValue = lastMessage[lastMessage.length - 1];

                    console.log("lastValue-date::", lastMessage);
                    console.log("lastValue::", lastValue);


                    var userNotificationDate = new Date(lastValue.dateAndTime);
                    now = new Date();
                    var sec_num = (now - userNotificationDate) / 1000;
                    var days = Math.floor(sec_num / (3600 * 24));
                    var hours = Math.floor((sec_num - (days * (3600 * 24))) / 3600);
                    var minutes = Math.floor((sec_num - (days * (3600 * 24)) - (hours * 3600)) / 60);
                    var seconds = Math.floor(sec_num - (days * (3600 * 24)) - (hours * 3600) - (minutes * 60));

                    // console.log("Days:-------", days);

                    if (hours < 10) { hours = "0" + hours; }
                    if (minutes < 10) { minutes = "0" + minutes; }
                    if (seconds < 10) { seconds = "0" + seconds; }

                    if (days > 28) {
                        const response = {
                            chatRoomId: findRoom.chatRoomId,
                            _id: userDetail[0]._id,
                            countUnreadMessage: count,
                            lastMessage: lastValue.text,
                            name: userDetail[0].firstName,
                            dateAndTime: new Date(userNotificationDate).toDateString(),
                            profile: userDetail[0].photo[0] == undefined ? "" : userDetail[0].photo[0].res,

                        }

                        unReadMessage.push(response);
                    } else if (days > 21 && days < 28) {
                        const response = {
                            chatRoomId: findRoom.chatRoomId,
                            _id: userDetail[0]._id,
                            countUnreadMessage: count,
                            lastMessage: lastValue.text,
                            name: userDetail[0].firstName,
                            dateAndTime: '3 weeks ago',
                            profile: userDetail[0].photo[0] == undefined ? "" : userDetail[0].photo[0].res,

                        }

                        unReadMessage.push(response);
                    } else if (days > 14 && days < 21) {
                        const response = {
                            chatRoomId: findRoom.chatRoomId,
                            _id: userDetail[0]._id,
                            countUnreadMessage: count,
                            lastMessage: lastValue.text,
                            name: userDetail[0].firstName,
                            dateAndTime: '2 weeks ago',
                            profile: userDetail[0].photo[0] == undefined ? "" : userDetail[0].photo[0].res,

                        }

                        unReadMessage.push(response);
                    } else if (days > 7 && days < 14) {
                        console.log("Date:::----", days);
                        const response = {
                            chatRoomId: findRoom.chatRoomId,
                            _id: userDetail[0]._id,
                            countUnreadMessage: count,
                            lastMessage: lastValue.text,
                            name: userDetail[0].firstName,
                            dateAndTime: '1 week ago',
                            profile: userDetail[0].photo[0] == undefined ? "" : userDetail[0].photo[0].res,

                        }

                        unReadMessage.push(response);
                    } else if (days > 0 && days < 7) {
                        console.log("days:::", days);
                        const response = {
                            chatRoomId: findRoom.chatRoomId,
                            _id: userDetail[0]._id,
                            countUnreadMessage: count,
                            lastMessage: lastValue.text,
                            name: userDetail[0].firstName,
                            dateAndTime: days == 1 ? `${days} day ago` : `${days} days ago`,
                            profile: userDetail[0].photo[0] == undefined ? "" : userDetail[0].photo[0].res,

                        }

                        unReadMessage.push(response);
                    } else if (hours > 0 && days == 0) {

                        console.log("hours::", hours);
                        console.log("condition::", hours > 0 && days == 0);

                        const response = {
                            chatRoomId: findRoom.chatRoomId,
                            _id: userDetail[0]._id,
                            countUnreadMessage: count,
                            lastMessage: lastValue.text,
                            name: userDetail[0].firstName,
                            dateAndTime: hours == 1 ? `${hours} hour ago` : `${hours} hours ago`,
                            profile: userDetail[0].photo[0] == undefined ? "" : userDetail[0].photo[0].res,
                        }

                        unReadMessage.push(response);
                    } else if (minutes > 0 && hours == 0) {
                        const response = {
                            chatRoomId: findRoom.chatRoomId,
                            _id: userDetail[0]._id,
                            countUnreadMessage: count,
                            lastMessage: lastValue.text,
                            name: userDetail[0].firstName,
                            dateAndTime: minutes == 1 ? `${minutes} minute ago` : `${minutes} minutes ago`,
                            profile: userDetail[0].photo[0] == undefined ? "" : userDetail[0].photo[0].res,

                        }

                        unReadMessage.push(response);
                    } else if (seconds > 0 && minutes == 0 && hours == 0 && days === 0) {

                        const response = {
                            chatRoomId: findRoom.chatRoomId,
                            _id: userDetail[0]._id,
                            countUnreadMessage: count,
                            lastMessage: lastValue.text,
                            name: userDetail[0].firstName,
                            dateAndTime: seconds == 1 ? `${seconds} second ago` : `${seconds} seconds ago`,
                            profile: userDetail[0].photo[0] == undefined ? "" : userDetail[0].photo[0].res,

                        }

                        unReadMessage.push(response);
                    } else if (seconds == 0 && minutes == 0 && hours == 0 && days === 0) {
                        const response = {
                            chatRoomId: findRoom.chatRoomId,
                            _id: userDetail[0]._id,
                            countUnreadMessage: count,
                            lastMessage: lastValue.text,
                            name: userDetail[0].firstName,
                            dateAndTime: `just now`,
                            profile: userDetail[0].photo[0] == undefined ? "" : userDetail[0].photo[0].res,
                        }

                        unReadMessage.push(response);
                    }
                }
            }
        }

        let uniqueObjArray = [...new Map(unReadMessage.map((item) => [item["_id"], item])).values()];
        const page = parseInt(req.query.page)
        const limit = parseInt(req.query.limit)
        const startIndex = (page - 1) * limit;
        const endIndex = page * limit;
        const data = uniqueObjArray.length;
        const pageCount = Math.ceil(data / limit);
        // console.log("uniqueObjArray", uniqueObjArray);

        // console.log(data);
        // console.log("date is", new Date(data));
        res.status(status.OK).json({
            "message": "all group",
            "status": true,
            "code": 200,
            "statusCode": 1,
            "pageCount": (pageCount).toString() == (NaN).toString() ? 0 : pageCount,
            "data": (startIndex).toString == (NaN).toString() ? uniqueObjArray.sort((a, b) => new Date(b.dateAndTime) - new Date(a.dateAndTime)) : uniqueObjArray.slice(startIndex, endIndex).sort((a, b) => new Date(b.dateAndTime) - new Date(a.dateAndTime))

        })

    } catch (error) {
        console.log("Error:", error);
        res.status(status.INTERNAL_SERVER_ERROR).json(
            new APIResponse("Something Went Wrong", "false", 500, "0", error.message)
        );
    }
}

exports.inAcallOrNot = async (req, res, next) => {
    try {

        const findChatRoomModel = await videoCallModel.findOne({
            chatRoomId: req.params.chat_room_id
        })

        if (findChatRoomModel) {

            if (findChatRoomModel.accepted == 1) {

                const sender = await userModel.findOne({
                    _id: findChatRoomModel.senderId
                })

                const receiver = await userModel.findOne({
                    _id: findChatRoomModel.receiverId
                })

                const userDetail = {
                    chatRoomId: req.params.chat_room_id,
                    senderId: sender._id,
                    receiverId: receiver._id,
                    userName: sender.firstName,
                    image: sender.photo ? sender.photo[0].res : "",
                }


                res.status(status.OK).json(
                    new APIResponse("not join video call!", "true", 200, "1", userDetail)
                );

            } else {
                res.status(status.OK).json(
                    new APIResponse("not join video call!", "true", 200, "1")
                );
            }

        } else {
            res.status(status.NOT_FOUND).json(
                new APIResponse("not create video call!", "false", 404, "0")
            );
        }


    } catch (error) {
        console.log("Error:", error);
        res.status(status.INTERNAL_SERVER_ERROR).json(
            new APIResponse("Something Went Wrong", "false", 500, "0", error.message)
        );
    }
}

exports.inAroomOrNot = async (req, res, next) => {
    try {


        const findUserInVideoCallRoom = await videoCallModel.findOne({
            receiverId: mongoose.Types.ObjectId(req.params.receiver_id),
            accepted: 0
        })

        // console.log("findUserInVideoCallRoom", findUserInVideoCallRoom);

        if (findUserInVideoCallRoom) {
            const receiver = await userModel.findOne({
                _id: findUserInVideoCallRoom.receiverId
            })

            const sender = await userModel.findOne({
                _id: findUserInVideoCallRoom.senderId
            })
            const data = {
                chatRoomId: findUserInVideoCallRoom.chatRoomId,
                senderId: findUserInVideoCallRoom.senderId,
                receiverId: findUserInVideoCallRoom.receiverId,
                userName: sender.firstName,
                image: sender.photo ? sender.photo[0].res : "",
            }

            // console.log("DATA", data);

            res.status(status.OK).json(
                new APIResponse("user in a room or not", "true", 200, "1", data)
            );
        } else {

            res.status(status.OK).json(
                new APIResponse("user not in a room or room not found", "true", 200, "1", {})
            );
        }
    } catch (error) {
        console.log("Error:", error);
        res.status(status.INTERNAL_SERVER_ERROR).json(
            new APIResponse("Something Went Wrong", "false", 500, "0", error.message)
        );
    }
}
