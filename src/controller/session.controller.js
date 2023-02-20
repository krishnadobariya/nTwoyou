const APIResponse = require("../helper/APIResponse");
const cloudinary = require("../utils/cloudinary.utils");
const status = require("http-status");
const sessionModel = require("../model/session.model");
const userModel = require("../model/user.model");
const e = require("express");
const notificationModel = require("../model/polyamorous/notification.model");
const requestsModel = require("../model/requests.model");
const { default: mongoose, set } = require("mongoose");
const cron = require("node-cron");
const Notification = require("../helper/firebaseHelper");
const sessionComment = require("../model/sessionComment");
const path = require('path');
const { log } = require("console");
const { updateOne } = require("../model/session.model");
const thumbUpCountInSession = require('../model/sessionThumbUp.model');
const superListModel = require("../model/suparMatch.model");
const rejectListModel = require("../model/rejectList.model");
const { argv } = require("process");
const chatRoomModel = require("../webSocket/models/chatRoom.model");
exports.sessionCreate = async (req, res, next) => {
    try {

        const findUserInUserModel = await userModel.findOne({
            _id: req.body.creted_session_user
        });
        console.log("findUserInUserModel::", findUserInUserModel);

        console.log("req.body.creted_session_user::::", req.body.creted_session_user);


        if (findUserInUserModel != null) {

            var val = Math.floor(1000 + Math.random() * 9000);
            console.log(val);
            console.log("req.body.selected_date", req.body.selected_date);
            const date = new Date(req.body.selected_date)
            let dates = date.getDate();
            let months = date.getMonth()
            let year = date.getFullYear();
            let hour = date.getHours();
            let hours = date.getHours();
            let minutes = date.getMinutes();
            let second = date.getSeconds();
            let month = date.toString('en-us', { month: 'long' });
            const mon = month.toString().split(" ")
            let ampm = hours >= 12 ? 'pm' : 'am';
            hours = hours % 12;
            hours = hours ? hours : 12;
            minutes = minutes.toString().padStart(2, '0');
            let strTime = hours + ' ' + ampm;
            let timeSession = 'At' + ' ' + hours + ':' + minutes + ' ' + ampm + ' ' + 'on' + ' ' + mon[0] + ' ' + mon[1] + ' ' + mon[2] + ' ' + mon[3]
            const createSession = sessionModel({
                selectedDate: `${year}-${months + 1}-${dates} ${hour}:${minutes}:${second}`,
                selectedTime: strTime,
                createUserIntId: val,
                cretedSessionUser: req.body.creted_session_user,
                participants: {
                    participants_1: req.body.participants_1 ? req.body.participants_1 : null,
                    participants_2: req.body.participants_2 ? req.body.participants_2 : null,
                    participants_3: req.body.participants_3 ? req.body.participants_3 : null
                },
                RoomType: req.body.room_type
            })


            const saveData = await createSession.save();


            if (req.body.room_type == "Public") {

                const userFrd = [];
                const findUserInRequesModel = await requestsModel.findOne({
                    userId: req.body.creted_session_user
                })

                const allRequestedEmails = [];
                const findUser = await requestsModel.findOne({
                    userId: req.body.creted_session_user
                })


                const p1 = req.body.participants_1 ? req.body.participants_1 : ""
                const p2 = req.body.participants_2 ? req.body.participants_2 : ""
                const p3 = req.body.participants_3 ? req.body.participants_3 : ""

                if (findUser != null) {

                    for (const allRequestedEmail of findUser.RequestedEmails) {

                        if (((allRequestedEmail.userId).toString() != (p1).toString()) && ((allRequestedEmail.userId).toString() != (p2).toString()) && ((allRequestedEmail.userId).toString() != (p3).toString())) {
                            allRequestedEmails.push(allRequestedEmail.userId)
                        }

                    }

                }

                const invitedUsers = [];
                if (p1) {
                    var val = Math.floor(1000 + Math.random() * 9000);

                    invitedUsers.push(mongoose.Types.ObjectId(req.body.participants_1))
                    await sessionModel.updateOne({
                        _id: saveData._id
                    }, {
                        $set: {
                            "participants.0.P1IntId": val
                        }
                    })
                }
                if (p2) {
                    var val = Math.floor(1000 + Math.random() * 9000);
                    invitedUsers.push(mongoose.Types.ObjectId(req.body.participants_2))
                    await sessionModel.updateOne({
                        _id: saveData._id
                    }, {
                        $set: {
                            "participants.0.P2IntId": val
                        }
                    })
                }
                if (p3) {
                    var val = Math.floor(1000 + Math.random() * 9000);
                    invitedUsers.push(mongoose.Types.ObjectId(req.body.participants_3))
                    await sessionModel.updateOne({
                        _id: saveData._id
                    }, {
                        $set: {
                            "participants.0.P3IntId": val
                        }
                    })
                }

                for (const notification of allRequestedEmails) {
                    const findUser = await userModel.findOne({
                        _id: notification
                    })

                    if (findUser.fcm_token) {
                        const title = "Session Created";
                        const body = `${findUserInUserModel.firstName} created session ${timeSession}`;

                        const sendBy = (findUserInUserModel._id).toString();
                        const registrationToken = findUser.fcm_token
                        Notification.sendPushNotificationFCM(
                            registrationToken,
                            title,
                            body,

                            sendBy,
                            true
                        );
                    }
                    const findInNotification = await notificationModel.findOne({
                        userId: notification
                    })

                    if (findInNotification) {

                        await notificationModel.updateOne({
                            userId: notification
                        }, {
                            $push: {
                                notifications: {
                                    notifications: `${findUserInUserModel.firstName} created session ${timeSession}`,
                                    userId: findUserInUserModel._id,
                                    status: 8
                                }
                            }
                        })
                    } else {

                        const savedata = notificationModel({
                            userId: notification,
                            notifications: {
                                notifications: `${findUserInUserModel.firstName} created session ${timeSession}`,
                                userId: findUserInUserModel._id,
                                status: 8
                            }
                        })

                        await savedata.save();

                    }
                }

                for (const invitedUser of invitedUsers) {

                    const findUser = await userModel.findOne({
                        _id: invitedUser
                    })


                    if (findUser.fcm_token) {
                        const title = "Session Invitation";
                        const body = `${findUserInUserModel.firstName} invited you in session ${timeSession}`;

                        const sendBy = (findUserInUserModel._id).toString();
                        const registrationToken = findUser.fcm_token
                        Notification.sendPushNotificationFCM(
                            registrationToken,
                            title,
                            body,

                            sendBy,
                            true
                        );

                    }


                    const findInNotification = await notificationModel.findOne({
                        userId: invitedUser
                    })

                    if (findInNotification) {

                        await notificationModel.updateOne({
                            userId: invitedUser
                        }, {
                            $push: {
                                notifications: {
                                    notifications: `${findUserInUserModel.firstName} invited you in session ${timeSession}`,
                                    userId: findUserInUserModel._id,
                                    status: 8
                                }
                            }
                        })
                    } else {

                        const savedata = notificationModel({
                            userId: invitedUser,
                            notifications: {
                                notifications: `${findUserInUserModel.firstName} invited you in session ${timeSession}`,
                                userId: findUserInUserModel._id,
                                status: 8
                            }
                        })

                        await savedata.save();

                    }
                }
            } else {

                const allRequestedEmails = [];

                const p1 = req.body.participants_1 ? req.body.participants_1 : ""
                const p2 = req.body.participants_2 ? req.body.participants_2 : ""
                const p3 = req.body.participants_3 ? req.body.participants_3 : ""


                if (p1) {
                    var val = Math.floor(1000 + Math.random() * 9000);


                    allRequestedEmails.push(mongoose.Types.ObjectId(req.body.participants_1))
                    await sessionModel.updateOne({
                        _id: saveData._id
                    }, {
                        $set: {
                            "participants.0.P1IntId": val
                        }
                    })

                }
                if (p2) {
                    var val = Math.floor(1000 + Math.random() * 9000);


                    allRequestedEmails.push(mongoose.Types.ObjectId(req.body.participants_2))
                    await sessionModel.updateOne({
                        _id: saveData._id
                    }, {
                        $set: {
                            "participants.0.P1IntId": val
                        }
                    })
                }
                if (p3) {
                    var val = Math.floor(1000 + Math.random() * 9000);


                    allRequestedEmails.push(mongoose.Types.ObjectId(req.body.participants_3))
                    await sessionModel.updateOne({
                        _id: saveData._id
                    }, {
                        $set: {
                            "participants.0.P1IntId": val
                        }
                    })
                }


                for (const notification of allRequestedEmails) {

                    const findUser = await userModel.findOne({
                        _id: notification
                    })

                    if (findUser.fcm_token) {
                        const title = "Session Invitation";
                        const body = `${findUserInUserModel.firstName} invited you in session ${timeSession}`;

                        const sendBy = (findUserInUserModel._id).toString();
                        const registrationToken = findUser.fcm_token
                        Notification.sendPushNotificationFCM(
                            registrationToken,
                            title,
                            body,

                            sendBy,
                            true
                        );
                    }

                    const findInNotification = await notificationModel.findOne({
                        userId: notification
                    })

                    if (findInNotification) {

                        await notificationModel.updateOne({
                            userId: notification
                        }, {
                            $push: {
                                notifications: {
                                    notifications: `${findUserInUserModel.firstName} invited you in session ${timeSession}`,
                                    userId: findUserInUserModel._id,
                                    status: 8
                                }
                            }
                        })

                    } else {

                        const savedata = notificationModel({
                            userId: notification,
                            notifications: {
                                notifications: `${findUserInUserModel.firstName} invited you in session ${timeSession}`,
                                userId: findUserInUserModel._id,
                                status: 8
                            }
                        })

                        await savedata.save();

                    }
                }

            }

            res.status(status.CREATED).json(
                new APIResponse("successfully Session Created!", "true", 201, "1")
            )

        } else {
            res.status(status.NOT_FOUND).json(
                new APIResponse("usernot found!", "false", 404, "0")
            )
        }

    } catch (error) {
        console.log("error", error);
        res.status(status.INTERNAL_SERVER_ERROR).json(
            new APIResponse("Something Went Wrong", "false", 500, "0", error.message)
        )
    }
}

exports.publicSession = async (req, res, next) => {
    try {

        const findPublicSession = await sessionModel.find({
            roomType: "Public",
            cretedSessionUser: {
                $ne: req.params.user_id
            },
        })

        const findPublicAll = await sessionModel.find({
            roomType: "Public"
        })

        const findPublicSessionMatch = await sessionModel.find({
            roomType: "Public",
            cretedSessionUser: {
                $eq: req.params.user_id
            },
        })

        const findPublicSessionParticipant1 = await sessionModel.find({
            roomType: "Public",
            participants: {
                $elemMatch: {
                    participants_1: {
                        $ne: req.params.user_id
                    }
                }
            }
        })
        const findPublicSessionParticipant1Match = await sessionModel.find({
            roomType: "Public",
            participants: {
                $elemMatch: {
                    participants_1: {
                        $eq: req.params.user_id
                    }
                }
            }
        })

        const findPublicSessionParticipant2 = await sessionModel.find({
            roomType: "Public",
            participants: {
                $elemMatch: {
                    participants_2: {
                        $ne: req.params.user_id
                    }
                }
            }
        })
        const findPublicSessionParticipant2Match = await sessionModel.find({
            roomType: "Public",
            participants: {
                $elemMatch: {
                    participants_2: {
                        $eq: req.params.user_id
                    }
                }
            }
        })

        const findPublicSessionParticipant3 = await sessionModel.find({
            roomType: "Public",
            participants: {
                $elemMatch: {
                    participants_3: {
                        $ne: req.params.user_id
                    }
                }
            }
        })

        const findPublicSessionParticipant3Match = await sessionModel.find({
            roomType: "Public",
            participants: {
                $elemMatch: {
                    participants_3: {
                        $eq: req.params.user_id
                    }
                }
            }
        })


        if (findPublicSessionMatch[0] != undefined) {

            const publicSession = [];
            const publicSession1 = [];

            for (const publicSessionwithUserDetails of findPublicSession) {

                const findUser = await userModel.findOne({
                    _id: publicSessionwithUserDetails.cretedSessionUser,
                    polyDating: 0
                })

                const participants1Find = await userModel.findOne({
                    _id: publicSessionwithUserDetails.participants[0].participants_1,
                    polyDating: 0
                })
                const participants2Find = await userModel.findOne({
                    _id: publicSessionwithUserDetails.participants[0].participants_2,
                    polyDating: 0
                })
                const participants3Find = await userModel.findOne({
                    _id: publicSessionwithUserDetails.participants[0].participants_3,
                    polyDating: 0
                })

                const participants_1 = {
                    _id: participants1Find ? participants1Find._id : "",
                    name: participants1Find ? participants1Find.firstName : "",
                    profile: participants1Find ? participants1Find.photo[0] ? participants1Find.photo[0].res : "" : "",
                }
                const participants_2 = {
                    _id: participants2Find ? participants2Find._id : "",
                    name: participants2Find ? participants2Find.firstName : "",
                    profile: participants2Find ? participants2Find.photo[0] ? participants2Find.photo[0].res : "" : "",
                }
                const participants_3 = {
                    _id: participants3Find ? participants3Find._id : "",
                    name: participants3Find ? participants3Find.firstName : "",
                    profile: participants3Find ? participants3Find.photo[0] ? participants3Find.photo[0].res : "" : "",
                }

                if (publicSessionwithUserDetails.sessionEndOrNot == false) {

                    if (participants1Find && participants2Find && participants3Find) {
                        // const sessionDetail = 
                        // const response = {
                        //     sessionDetail
                        // }

                        const dates = publicSessionwithUserDetails.selectedDate;
                        const finalDate = new Date(dates)
                        let month = finalDate.toLocaleString('en-us', { month: 'long' });
                        let months = finalDate.getMonth();
                        let date = finalDate.getDate();
                        let year = finalDate.getFullYear();
                        let hour = finalDate.getHours();

                        let hours = finalDate.getHours();
                        let minutes = finalDate.getMinutes();
                        let ampm = hours >= 12 ? 'pm' : 'am';
                        hours = hours % 12;
                        hours = hours ? hours : 12;
                        minutes = minutes.toString().padStart(2, '0');
                        let strTime = hours + ':' + minutes + ' ' + ampm;

                        publicSession.push({
                            _id: publicSessionwithUserDetails._id,
                            cretedSessionUserId: findUser._id,
                            cretedSessionUsername: findUser.firstName,
                            selectedDate: `${year}-${months + 1}-${date} ${hour}:${minutes}`,
                            selectedTime: publicSessionwithUserDetails.selectedTime,
                            roomType: publicSessionwithUserDetails.RoomType,
                            detail: publicSessionwithUserDetails.started == true ? `${publicSessionwithUserDetails.countJoinUser} people joining` : `${date} ${month} ${year} ${strTime}`,
                            isLive: publicSessionwithUserDetails.started,
                            isAbleToJoin: publicSessionwithUserDetails.started,
                            cretedSessionUserphoto: findUser.photo == undefined ? "" : findUser.photo[0] ? findUser.photo[0].res : "",
                            participants: [
                                participants_1,
                                participants_2,
                                participants_3
                            ]
                        })
                    } else if (participants1Find == null && participants2Find && participants3Find) {
                        // const sessionDetail = 
                        // const response = {
                        //     sessionDetail
                        // }

                        const dates = publicSessionwithUserDetails.selectedDate;
                        const finalDate = new Date(dates)
                        let month = finalDate.toLocaleString('en-us', { month: 'long' });
                        let months = finalDate.getMonth();
                        let date = finalDate.getDate();
                        let year = finalDate.getFullYear();
                        let hour = finalDate.getHours();

                        let hours = finalDate.getHours();
                        let minutes = finalDate.getMinutes();
                        let ampm = hours >= 12 ? 'pm' : 'am';
                        hours = hours % 12;
                        hours = hours ? hours : 12;
                        minutes = minutes.toString().padStart(2, '0');
                        let strTime = hours + ':' + minutes + ' ' + ampm;

                        publicSession.push({
                            _id: publicSessionwithUserDetails._id,
                            cretedSessionUserId: findUser._id,
                            cretedSessionUsername: findUser.firstName,
                            selectedDate: `${year}-${months + 1}-${date} ${hour}:${minutes}`,
                            selectedTime: publicSessionwithUserDetails.selectedTime,
                            roomType: publicSessionwithUserDetails.RoomType,
                            detail: publicSessionwithUserDetails.started == true ? `${publicSessionwithUserDetails.countJoinUser} people joining` : `${date} ${month} ${year} ${strTime}`,
                            isLive: publicSessionwithUserDetails.started,
                            isAbleToJoin: publicSessionwithUserDetails.started,
                            cretedSessionUserphoto: findUser.photo == undefined ? "" : findUser.photo[0] ? findUser.photo[0].res : "",
                            participants: [
                                participants_2,
                                participants_3
                            ]
                        })
                    } else if (participants1Find && participants2Find == null && participants3Find) {

                        const dates = publicSessionwithUserDetails.selectedDate;
                        const finalDate = new Date(dates)
                        let month = finalDate.toLocaleString('en-us', { month: 'long' });
                        let months = finalDate.getMonth();
                        let date = finalDate.getDate();
                        let year = finalDate.getFullYear();
                        let hour = finalDate.getHours();

                        let hours = finalDate.getHours();
                        let minutes = finalDate.getMinutes();
                        let ampm = hours >= 12 ? 'pm' : 'am';
                        hours = hours % 12;
                        hours = hours ? hours : 12;
                        minutes = minutes.toString().padStart(2, '0');
                        let strTime = hours + ':' + minutes + ' ' + ampm;


                        const sessionDetail = {
                            _id: publicSessionwithUserDetails._id,
                            cretedSessionUserId: findUser._id,
                            cretedSessionUsername: findUser.firstName,
                            selectedDate: `${year}-${months + 1}-${date} ${hour}:${minutes}`,
                            selectedTime: publicSessionwithUserDetails.selectedTime,
                            roomType: publicSessionwithUserDetails.RoomType,
                            detail: publicSessionwithUserDetails.started == true ? `${publicSessionwithUserDetails.countJoinUser} people joining` : `${date} ${month} ${year} ${strTime}`,
                            isLive: publicSessionwithUserDetails.started,
                            isAbleToJoin: publicSessionwithUserDetails.started,
                            cretedSessionUserphoto: findUser.photo == undefined ? "" : findUser.photo[0] ? findUser.photo[0].res : "",
                            participants: [
                                participants_1,
                                participants_3
                            ]
                        }
                        const response = {
                            sessionDetail
                        }
                        publicSession.push(response)
                    } else if (participants1Find && participants2Find && participants3Find == null) {
                        // const sessionDetail = 
                        // const response = {
                        //     sessionDetail
                        // }

                        const dates = publicSessionwithUserDetails.selectedDate;
                        const finalDate = new Date(dates)
                        let month = finalDate.toLocaleString('en-us', { month: 'long' });
                        let months = finalDate.getMonth();
                        let date = finalDate.getDate();
                        let year = finalDate.getFullYear();
                        let hour = finalDate.getHours();

                        let hours = finalDate.getHours();
                        let minutes = finalDate.getMinutes();
                        let ampm = hours >= 12 ? 'pm' : 'am';
                        hours = hours % 12;
                        hours = hours ? hours : 12;
                        minutes = minutes.toString().padStart(2, '0');
                        let strTime = hours + ':' + minutes + ' ' + ampm;



                        publicSession.push({
                            _id: publicSessionwithUserDetails._id,
                            cretedSessionUserId: findUser._id,
                            cretedSessionUsername: findUser.firstName,
                            selectedDate: `${year}-${months + 1}-${date} ${hour}:${minutes}`,
                            selectedTime: publicSessionwithUserDetails.selectedTime,
                            roomType: publicSessionwithUserDetails.RoomType,
                            detail: publicSessionwithUserDetails.started == true ? `${publicSessionwithUserDetails.countJoinUser} people joining` : `${date} ${month} ${year} ${strTime}`,
                            isLive: publicSessionwithUserDetails.started,
                            isAbleToJoin: publicSessionwithUserDetails.started,
                            cretedSessionUserphoto: findUser.photo == undefined ? "" : findUser.photo[0] ? findUser.photo[0].res : "",
                            participants: [
                                participants_1,
                                participants_2
                            ]
                        })

                    } else if (participants1Find == null && participants2Find == null && participants3Find == null) {
                        // const sessionDetail =
                        // const response = {
                        //     sessionDetail
                        // }

                        const dates = publicSessionwithUserDetails.selectedDate;
                        const finalDate = new Date(dates)
                        let month = finalDate.toLocaleString('en-us', { month: 'long' });
                        let months = finalDate.getMonth();
                        let date = finalDate.getDate();
                        let year = finalDate.getFullYear();
                        let hour = finalDate.getHours();

                        let hours = finalDate.getHours();
                        let minutes = finalDate.getMinutes();
                        let ampm = hours >= 12 ? 'pm' : 'am';
                        hours = hours % 12;
                        hours = hours ? hours : 12;
                        minutes = minutes.toString().padStart(2, '0');
                        let strTime = hours + ':' + minutes + ' ' + ampm;


                        publicSession.push({
                            _id: publicSessionwithUserDetails._id,
                            cretedSessionUserId: findUser._id,
                            cretedSessionUsername: findUser.firstName,
                            selectedDate: `${year}-${months + 1}-${date} ${hour}:${minutes}`,
                            selectedTime: publicSessionwithUserDetails.selectedTime,
                            roomType: publicSessionwithUserDetails.RoomType,
                            detail: publicSessionwithUserDetails.started == true ? `${publicSessionwithUserDetails.countJoinUser} people joining` : `${date} ${month} ${year} ${strTime}`,
                            isLive: publicSessionwithUserDetails.started,
                            isAbleToJoin: publicSessionwithUserDetails.started,
                            cretedSessionUserphoto: findUser.photo == undefined ? "" : findUser.photo[0] ? findUser.photo[0].res : "",
                            participants: []
                        })
                    }

                } else {

                    if (participants1Find && participants2Find && participants3Find) {
                        // const sessionDetail = 
                        // const response = {
                        //     sessionDetail
                        // }

                        const dates = publicSessionwithUserDetails.selectedDate;
                        const finalDate = new Date(dates)
                        let month = finalDate.toLocaleString('en-us', { month: 'long' });
                        let months = finalDate.getMonth();
                        let date = finalDate.getDate();
                        let year = finalDate.getFullYear();
                        let hour = finalDate.getHours();

                        let hours = finalDate.getHours();
                        let minutes = finalDate.getMinutes();
                        let ampm = hours >= 12 ? 'pm' : 'am';
                        hours = hours % 12;
                        hours = hours ? hours : 12;
                        minutes = minutes.toString().padStart(2, '0');
                        let strTime = hours + ':' + minutes + ' ' + ampm;

                        publicSession1.push({
                            _id: publicSessionwithUserDetails._id,
                            cretedSessionUserId: findUser._id,
                            cretedSessionUsername: findUser.firstName,
                            selectedDate: `${year}-${months + 1}-${date} ${hour}:${minutes}`,
                            selectedTime: publicSessionwithUserDetails.selectedTime,
                            roomType: publicSessionwithUserDetails.RoomType,
                            detail: publicSessionwithUserDetails.started == true ? `${publicSessionwithUserDetails.countJoinUser} people joining` : `${date} ${month} ${year} ${strTime}`,
                            isLive: publicSessionwithUserDetails.started,
                            isAbleToJoin: publicSessionwithUserDetails.started,
                            cretedSessionUserphoto: findUser.photo == undefined ? "" : findUser.photo[0] ? findUser.photo[0].res : "",
                            participants: [
                                participants_1,
                                participants_2,
                                participants_3
                            ]
                        })
                    } else if (participants1Find == null && participants2Find && participants3Find) {
                        // const sessionDetail = 
                        // const response = {
                        //     sessionDetail
                        // }

                        const dates = publicSessionwithUserDetails.selectedDate;
                        const finalDate = new Date(dates)
                        let month = finalDate.toLocaleString('en-us', { month: 'long' });
                        let months = finalDate.getMonth();
                        let date = finalDate.getDate();
                        let year = finalDate.getFullYear();
                        let hour = finalDate.getHours();

                        let hours = finalDate.getHours();
                        let minutes = finalDate.getMinutes();
                        let ampm = hours >= 12 ? 'pm' : 'am';
                        hours = hours % 12;
                        hours = hours ? hours : 12;
                        minutes = minutes.toString().padStart(2, '0');
                        let strTime = hours + ':' + minutes + ' ' + ampm;

                        publicSession1.push({
                            _id: publicSessionwithUserDetails._id,
                            cretedSessionUserId: findUser._id,
                            cretedSessionUsername: findUser.firstName,
                            selectedDate: `${year}-${months + 1}-${date} ${hour}:${minutes}`,
                            selectedTime: publicSessionwithUserDetails.selectedTime,
                            roomType: publicSessionwithUserDetails.RoomType,
                            detail: publicSessionwithUserDetails.started == true ? `${publicSessionwithUserDetails.countJoinUser} people joining` : `${date} ${month} ${year} ${strTime}`,
                            isLive: publicSessionwithUserDetails.started,
                            isAbleToJoin: publicSessionwithUserDetails.started,
                            cretedSessionUserphoto: findUser.photo == undefined ? "" : findUser.photo[0] ? findUser.photo[0].res : "",
                            participants: [
                                participants_2,
                                participants_3
                            ]
                        })
                    } else if (participants1Find && participants2Find == null && participants3Find) {

                        const dates = publicSessionwithUserDetails.selectedDate;
                        const finalDate = new Date(dates)
                        let month = finalDate.toLocaleString('en-us', { month: 'long' });
                        let months = finalDate.getMonth();
                        let date = finalDate.getDate();
                        let year = finalDate.getFullYear();
                        let hour = finalDate.getHours();

                        let hours = finalDate.getHours();
                        let minutes = finalDate.getMinutes();
                        let ampm = hours >= 12 ? 'pm' : 'am';
                        hours = hours % 12;
                        hours = hours ? hours : 12;
                        minutes = minutes.toString().padStart(2, '0');
                        let strTime = hours + ':' + minutes + ' ' + ampm;


                        const sessionDetail = {
                            _id: publicSessionwithUserDetails._id,
                            cretedSessionUserId: findUser._id,
                            cretedSessionUsername: findUser.firstName,
                            selectedDate: `${year}-${months + 1}-${date} ${hour}:${minutes}`,
                            selectedTime: publicSessionwithUserDetails.selectedTime,
                            roomType: publicSessionwithUserDetails.RoomType,
                            detail: publicSessionwithUserDetails.started == true ? `${publicSessionwithUserDetails.countJoinUser} people joining` : `${date} ${month} ${year} ${strTime}`,
                            isLive: publicSessionwithUserDetails.started,
                            isAbleToJoin: publicSessionwithUserDetails.started,
                            cretedSessionUserphoto: findUser.photo == undefined ? "" : findUser.photo[0] ? findUser.photo[0].res : "",
                            participants: [
                                participants_1,
                                participants_3
                            ]
                        }
                        const response = {
                            sessionDetail
                        }
                        publicSession1.push(response)
                    } else if (participants1Find && participants2Find && participants3Find == null) {
                        // const sessionDetail = 
                        // const response = {
                        //     sessionDetail
                        // }

                        const dates = publicSessionwithUserDetails.selectedDate;
                        const finalDate = new Date(dates)
                        let month = finalDate.toLocaleString('en-us', { month: 'long' });
                        let months = finalDate.getMonth();
                        let date = finalDate.getDate();
                        let year = finalDate.getFullYear();
                        let hour = finalDate.getHours();

                        let hours = finalDate.getHours();
                        let minutes = finalDate.getMinutes();
                        let ampm = hours >= 12 ? 'pm' : 'am';
                        hours = hours % 12;
                        hours = hours ? hours : 12;
                        minutes = minutes.toString().padStart(2, '0');
                        let strTime = hours + ':' + minutes + ' ' + ampm;



                        publicSession1.push({
                            _id: publicSessionwithUserDetails._id,
                            cretedSessionUserId: findUser._id,
                            cretedSessionUsername: findUser.firstName,
                            selectedDate: `${year}-${months + 1}-${date} ${hour}:${minutes}`,
                            selectedTime: publicSessionwithUserDetails.selectedTime,
                            roomType: publicSessionwithUserDetails.RoomType,
                            detail: publicSessionwithUserDetails.started == true ? `${publicSessionwithUserDetails.countJoinUser} people joining` : `${date} ${month} ${year} ${strTime}`,
                            isLive: publicSessionwithUserDetails.started,
                            isAbleToJoin: publicSessionwithUserDetails.started,
                            cretedSessionUserphoto: findUser.photo == undefined ? "" : findUser.photo[0] ? findUser.photo[0].res : "",
                            participants: [
                                participants_1,
                                participants_2
                            ]
                        })

                    } else if (participants1Find == null && participants2Find == null && participants3Find == null) {
                        // const sessionDetail =
                        // const response = {
                        //     sessionDetail
                        // }

                        const dates = publicSessionwithUserDetails.selectedDate;
                        const finalDate = new Date(dates)
                        let month = finalDate.toLocaleString('en-us', { month: 'long' });
                        let months = finalDate.getMonth();
                        let date = finalDate.getDate();
                        let year = finalDate.getFullYear();
                        let hour = finalDate.getHours();

                        let hours = finalDate.getHours();
                        let minutes = finalDate.getMinutes();
                        let ampm = hours >= 12 ? 'pm' : 'am';
                        hours = hours % 12;
                        hours = hours ? hours : 12;
                        minutes = minutes.toString().padStart(2, '0');
                        let strTime = hours + ':' + minutes + ' ' + ampm;


                        publicSession1.push({
                            _id: publicSessionwithUserDetails._id,
                            cretedSessionUserId: findUser._id,
                            cretedSessionUsername: findUser.firstName,
                            selectedDate: `${year}-${months + 1}-${date} ${hour}:${minutes}`,
                            selectedTime: publicSessionwithUserDetails.selectedTime,
                            roomType: publicSessionwithUserDetails.RoomType,
                            detail: publicSessionwithUserDetails.started == true ? `${publicSessionwithUserDetails.countJoinUser} people joining` : `${date} ${month} ${year} ${strTime}`,
                            isLive: publicSessionwithUserDetails.started,
                            isAbleToJoin: publicSessionwithUserDetails.started,
                            cretedSessionUserphoto: findUser.photo == undefined ? "" : findUser.photo[0] ? findUser.photo[0].res : "",
                            participants: []
                        })
                    }

                }

            }

            const res1 = publicSession.sort((a, b) => new Date(a.selectedDate) - new Date(b.selectedDate))
            const response = [...res1, ...publicSession1]

            const page = parseInt(req.query.page)
            const limit = parseInt(req.query.limit)
            const startIndex = (page - 1) * limit;
            const endIndex = page * limit;
            const data = publicSession.length;
            const pageCount = Math.ceil(data / limit);
            res.status(status.OK).json({
                "message": "successfully Show All Public Session!",
                "status": true,
                "code": 200,
                "statusCode": 1,
                "pageCount": (pageCount).toString() == (NaN).toString() ? 0 : pageCount,
                "data": (startIndex).toString() == (NaN).toString() ? response : response.slice(startIndex, endIndex)

            })


        } else if (findPublicSessionParticipant1Match[0] != undefined) {



            const publicSession = [];
            const publicSession1 = [];

            for (const publicSessionwithUserDetails of findPublicSessionParticipant1) {

                const findUser = await userModel.findOne({
                    _id: publicSessionwithUserDetails.cretedSessionUser,
                    polyDating: 0
                })

                const participants1Find = await userModel.findOne({
                    _id: publicSessionwithUserDetails.participants[0].participants_1,
                    polyDating: 0
                })
                const participants2Find = await userModel.findOne({
                    _id: publicSessionwithUserDetails.participants[0].participants_2,
                    polyDating: 0
                })
                const participants3Find = await userModel.findOne({
                    _id: publicSessionwithUserDetails.participants[0].participants_3,
                    polyDating: 0
                })

                const participants_1 = {
                    _id: participants1Find ? participants1Find._id : "",
                    name: participants1Find ? participants1Find.firstName : "",
                    profile: participants1Find ? participants1Find.photo[0] ? participants1Find.photo[0].res : "" : "",
                }
                const participants_2 = {
                    _id: participants2Find ? participants2Find._id : "",
                    name: participants2Find ? participants2Find.firstName : "",
                    profile: participants2Find ? participants2Find.photo[0] ? participants2Find.photo[0].res : "" : "",
                }
                const participants_3 = {
                    _id: participants3Find ? participants3Find._id : "",
                    name: participants3Find ? participants3Find.firstName : "",
                    profile: participants3Find ? participants3Find.photo[0] ? participants3Find.photo[0].res : "" : "",
                }

                if (publicSessionwithUserDetails.sessionEndOrNot == false) {

                    if (participants1Find && participants2Find && participants3Find) {
                        // const sessionDetail = 
                        // const response = {
                        //     sessionDetail
                        // }

                        const dates = publicSessionwithUserDetails.selectedDate;
                        const finalDate = new Date(dates)
                        let month = finalDate.toLocaleString('en-us', { month: 'long' });
                        let months = finalDate.getMonth();
                        let date = finalDate.getDate();
                        let year = finalDate.getFullYear();
                        let hour = finalDate.getHours();

                        let hours = finalDate.getHours();
                        let minutes = finalDate.getMinutes();
                        let ampm = hours >= 12 ? 'pm' : 'am';
                        hours = hours % 12;
                        hours = hours ? hours : 12;
                        minutes = minutes.toString().padStart(2, '0');
                        let strTime = hours + ':' + minutes + ' ' + ampm;

                        publicSession.push({
                            _id: publicSessionwithUserDetails._id,
                            cretedSessionUserId: findUser._id,
                            cretedSessionUsername: findUser.firstName,
                            selectedDate: `${year}-${months + 1}-${date} ${hour}:${minutes}`,
                            selectedTime: publicSessionwithUserDetails.selectedTime,
                            roomType: publicSessionwithUserDetails.RoomType,
                            detail: publicSessionwithUserDetails.started == true ? `${publicSessionwithUserDetails.countJoinUser} people joining` : `${date} ${month} ${year} ${strTime}`,
                            isLive: publicSessionwithUserDetails.started,
                            isAbleToJoin: publicSessionwithUserDetails.started,
                            cretedSessionUserphoto: findUser.photo == undefined ? "" : findUser.photo[0] ? findUser.photo[0].res : "",
                            participants: [
                                participants_1,
                                participants_2,
                                participants_3
                            ]
                        })
                    } else if (participants1Find == null && participants2Find && participants3Find) {
                        // const sessionDetail = 
                        // const response = {
                        //     sessionDetail
                        // }

                        const dates = publicSessionwithUserDetails.selectedDate;
                        const finalDate = new Date(dates)
                        let month = finalDate.toLocaleString('en-us', { month: 'long' });
                        let months = finalDate.getMonth();
                        let date = finalDate.getDate();
                        let year = finalDate.getFullYear();
                        let hour = finalDate.getHours();

                        let hours = finalDate.getHours();
                        let minutes = finalDate.getMinutes();
                        let ampm = hours >= 12 ? 'pm' : 'am';
                        hours = hours % 12;
                        hours = hours ? hours : 12;
                        minutes = minutes.toString().padStart(2, '0');
                        let strTime = hours + ':' + minutes + ' ' + ampm;

                        publicSession.push({
                            _id: publicSessionwithUserDetails._id,
                            cretedSessionUserId: findUser._id,
                            cretedSessionUsername: findUser.firstName,
                            selectedDate: `${year}-${months + 1}-${date} ${hour}:${minutes}`,
                            selectedTime: publicSessionwithUserDetails.selectedTime,
                            roomType: publicSessionwithUserDetails.RoomType,
                            detail: publicSessionwithUserDetails.started == true ? `${publicSessionwithUserDetails.countJoinUser} people joining` : `${date} ${month} ${year} ${strTime}`,
                            isLive: publicSessionwithUserDetails.started,
                            isAbleToJoin: publicSessionwithUserDetails.started,
                            cretedSessionUserphoto: findUser.photo == undefined ? "" : findUser.photo[0] ? findUser.photo[0].res : "",
                            participants: [
                                participants_2,
                                participants_3
                            ]
                        })
                    } else if (participants1Find && participants2Find == null && participants3Find) {

                        const dates = publicSessionwithUserDetails.selectedDate;
                        const finalDate = new Date(dates)
                        let month = finalDate.toLocaleString('en-us', { month: 'long' });
                        let months = finalDate.getMonth();
                        let date = finalDate.getDate();
                        let year = finalDate.getFullYear();
                        let hour = finalDate.getHours();

                        let hours = finalDate.getHours();
                        let minutes = finalDate.getMinutes();
                        let ampm = hours >= 12 ? 'pm' : 'am';
                        hours = hours % 12;
                        hours = hours ? hours : 12;
                        minutes = minutes.toString().padStart(2, '0');
                        let strTime = hours + ':' + minutes + ' ' + ampm;


                        const sessionDetail = {
                            _id: publicSessionwithUserDetails._id,
                            cretedSessionUserId: findUser._id,
                            cretedSessionUsername: findUser.firstName,
                            selectedDate: `${year}-${months + 1}-${date} ${hour}:${minutes}`,
                            selectedTime: publicSessionwithUserDetails.selectedTime,
                            roomType: publicSessionwithUserDetails.RoomType,
                            detail: publicSessionwithUserDetails.started == true ? `${publicSessionwithUserDetails.countJoinUser} people joining` : `${date} ${month} ${year} ${strTime}`,
                            isLive: publicSessionwithUserDetails.started,
                            isAbleToJoin: publicSessionwithUserDetails.started,
                            cretedSessionUserphoto: findUser.photo == undefined ? "" : findUser.photo[0] ? findUser.photo[0].res : "",
                            participants: [
                                participants_1,
                                participants_3
                            ]
                        }
                        const response = {
                            sessionDetail
                        }
                        publicSession.push(response)
                    } else if (participants1Find && participants2Find && participants3Find == null) {
                        // const sessionDetail = 
                        // const response = {
                        //     sessionDetail
                        // }

                        const dates = publicSessionwithUserDetails.selectedDate;
                        const finalDate = new Date(dates)
                        let month = finalDate.toLocaleString('en-us', { month: 'long' });
                        let months = finalDate.getMonth();
                        let date = finalDate.getDate();
                        let year = finalDate.getFullYear();
                        let hour = finalDate.getHours();

                        let hours = finalDate.getHours();
                        let minutes = finalDate.getMinutes();
                        let ampm = hours >= 12 ? 'pm' : 'am';
                        hours = hours % 12;
                        hours = hours ? hours : 12;
                        minutes = minutes.toString().padStart(2, '0');
                        let strTime = hours + ':' + minutes + ' ' + ampm;



                        publicSession.push({
                            _id: publicSessionwithUserDetails._id,
                            cretedSessionUserId: findUser._id,
                            cretedSessionUsername: findUser.firstName,
                            selectedDate: `${year}-${months + 1}-${date} ${hour}:${minutes}`,
                            selectedTime: publicSessionwithUserDetails.selectedTime,
                            roomType: publicSessionwithUserDetails.RoomType,
                            detail: publicSessionwithUserDetails.started == true ? `${publicSessionwithUserDetails.countJoinUser} people joining` : `${date} ${month} ${year} ${strTime}`,
                            isLive: publicSessionwithUserDetails.started,
                            isAbleToJoin: publicSessionwithUserDetails.started,
                            cretedSessionUserphoto: findUser.photo == undefined ? "" : findUser.photo[0] ? findUser.photo[0].res : "",
                            participants: [
                                participants_1,
                                participants_2
                            ]
                        })

                    } else if (participants1Find == null && participants2Find == null && participants3Find == null) {
                        // const sessionDetail =
                        // const response = {
                        //     sessionDetail
                        // }

                        const dates = publicSessionwithUserDetails.selectedDate;
                        const finalDate = new Date(dates)
                        let month = finalDate.toLocaleString('en-us', { month: 'long' });
                        let months = finalDate.getMonth();
                        let date = finalDate.getDate();
                        let year = finalDate.getFullYear();
                        let hour = finalDate.getHours();

                        let hours = finalDate.getHours();
                        let minutes = finalDate.getMinutes();
                        let ampm = hours >= 12 ? 'pm' : 'am';
                        hours = hours % 12;
                        hours = hours ? hours : 12;
                        minutes = minutes.toString().padStart(2, '0');
                        let strTime = hours + ':' + minutes + ' ' + ampm;


                        publicSession.push({
                            _id: publicSessionwithUserDetails._id,
                            cretedSessionUserId: findUser._id,
                            cretedSessionUsername: findUser.firstName,
                            selectedDate: `${year}-${months + 1}-${date} ${hour}:${minutes}`,
                            selectedTime: publicSessionwithUserDetails.selectedTime,
                            roomType: publicSessionwithUserDetails.RoomType,
                            detail: publicSessionwithUserDetails.started == true ? `${publicSessionwithUserDetails.countJoinUser} people joining` : `${date} ${month} ${year} ${strTime}`,
                            isLive: publicSessionwithUserDetails.started,
                            isAbleToJoin: publicSessionwithUserDetails.started,
                            cretedSessionUserphoto: findUser.photo == undefined ? "" : findUser.photo[0] ? findUser.photo[0].res : "",
                            participants: []
                        })
                    }

                } else {

                    if (participants1Find && participants2Find && participants3Find) {
                        // const sessionDetail = 
                        // const response = {
                        //     sessionDetail
                        // }

                        const dates = publicSessionwithUserDetails.selectedDate;
                        const finalDate = new Date(dates)
                        let month = finalDate.toLocaleString('en-us', { month: 'long' });
                        let months = finalDate.getMonth();
                        let date = finalDate.getDate();
                        let year = finalDate.getFullYear();
                        let hour = finalDate.getHours();

                        let hours = finalDate.getHours();
                        let minutes = finalDate.getMinutes();
                        let ampm = hours >= 12 ? 'pm' : 'am';
                        hours = hours % 12;
                        hours = hours ? hours : 12;
                        minutes = minutes.toString().padStart(2, '0');
                        let strTime = hours + ':' + minutes + ' ' + ampm;

                        publicSession1.push({
                            _id: publicSessionwithUserDetails._id,
                            cretedSessionUserId: findUser._id,
                            cretedSessionUsername: findUser.firstName,
                            selectedDate: `${year}-${months + 1}-${date} ${hour}:${minutes}`,
                            selectedTime: publicSessionwithUserDetails.selectedTime,
                            roomType: publicSessionwithUserDetails.RoomType,
                            detail: publicSessionwithUserDetails.started == true ? `${publicSessionwithUserDetails.countJoinUser} people joining` : `${date} ${month} ${year} ${strTime}`,
                            isLive: publicSessionwithUserDetails.started,
                            isAbleToJoin: publicSessionwithUserDetails.started,
                            cretedSessionUserphoto: findUser.photo == undefined ? "" : findUser.photo[0] ? findUser.photo[0].res : "",
                            participants: [
                                participants_1,
                                participants_2,
                                participants_3
                            ]
                        })
                    } else if (participants1Find == null && participants2Find && participants3Find) {
                        // const sessionDetail = 
                        // const response = {
                        //     sessionDetail
                        // }

                        const dates = publicSessionwithUserDetails.selectedDate;
                        const finalDate = new Date(dates)
                        let month = finalDate.toLocaleString('en-us', { month: 'long' });
                        let months = finalDate.getMonth();
                        let date = finalDate.getDate();
                        let year = finalDate.getFullYear();
                        let hour = finalDate.getHours();

                        let hours = finalDate.getHours();
                        let minutes = finalDate.getMinutes();
                        let ampm = hours >= 12 ? 'pm' : 'am';
                        hours = hours % 12;
                        hours = hours ? hours : 12;
                        minutes = minutes.toString().padStart(2, '0');
                        let strTime = hours + ':' + minutes + ' ' + ampm;

                        publicSession1.push({
                            _id: publicSessionwithUserDetails._id,
                            cretedSessionUserId: findUser._id,
                            cretedSessionUsername: findUser.firstName,
                            selectedDate: `${year}-${months + 1}-${date} ${hour}:${minutes}`,
                            selectedTime: publicSessionwithUserDetails.selectedTime,
                            roomType: publicSessionwithUserDetails.RoomType,
                            detail: publicSessionwithUserDetails.started == true ? `${publicSessionwithUserDetails.countJoinUser} people joining` : `${date} ${month} ${year} ${strTime}`,
                            isLive: publicSessionwithUserDetails.started,
                            isAbleToJoin: publicSessionwithUserDetails.started,
                            cretedSessionUserphoto: findUser.photo == undefined ? "" : findUser.photo[0] ? findUser.photo[0].res : "",
                            participants: [
                                participants_2,
                                participants_3
                            ]
                        })
                    } else if (participants1Find && participants2Find == null && participants3Find) {

                        const dates = publicSessionwithUserDetails.selectedDate;
                        const finalDate = new Date(dates)
                        let month = finalDate.toLocaleString('en-us', { month: 'long' });
                        let months = finalDate.getMonth();
                        let date = finalDate.getDate();
                        let year = finalDate.getFullYear();
                        let hour = finalDate.getHours();

                        let hours = finalDate.getHours();
                        let minutes = finalDate.getMinutes();
                        let ampm = hours >= 12 ? 'pm' : 'am';
                        hours = hours % 12;
                        hours = hours ? hours : 12;
                        minutes = minutes.toString().padStart(2, '0');
                        let strTime = hours + ':' + minutes + ' ' + ampm;


                        const sessionDetail = {
                            _id: publicSessionwithUserDetails._id,
                            cretedSessionUserId: findUser._id,
                            cretedSessionUsername: findUser.firstName,
                            selectedDate: `${year}-${months + 1}-${date} ${hour}:${minutes}`,
                            selectedTime: publicSessionwithUserDetails.selectedTime,
                            roomType: publicSessionwithUserDetails.RoomType,
                            detail: publicSessionwithUserDetails.started == true ? `${publicSessionwithUserDetails.countJoinUser} people joining` : `${date} ${month} ${year} ${strTime}`,
                            isLive: publicSessionwithUserDetails.started,
                            isAbleToJoin: publicSessionwithUserDetails.started,
                            cretedSessionUserphoto: findUser.photo == undefined ? "" : findUser.photo[0] ? findUser.photo[0].res : "",
                            participants: [
                                participants_1,
                                participants_3
                            ]
                        }
                        const response = {
                            sessionDetail
                        }
                        publicSession1.push(response)
                    } else if (participants1Find && participants2Find && participants3Find == null) {
                        // const sessionDetail = 
                        // const response = {
                        //     sessionDetail
                        // }

                        const dates = publicSessionwithUserDetails.selectedDate;
                        const finalDate = new Date(dates)
                        let month = finalDate.toLocaleString('en-us', { month: 'long' });
                        let months = finalDate.getMonth();
                        let date = finalDate.getDate();
                        let year = finalDate.getFullYear();
                        let hour = finalDate.getHours();

                        let hours = finalDate.getHours();
                        let minutes = finalDate.getMinutes();
                        let ampm = hours >= 12 ? 'pm' : 'am';
                        hours = hours % 12;
                        hours = hours ? hours : 12;
                        minutes = minutes.toString().padStart(2, '0');
                        let strTime = hours + ':' + minutes + ' ' + ampm;



                        publicSession1.push({
                            _id: publicSessionwithUserDetails._id,
                            cretedSessionUserId: findUser._id,
                            cretedSessionUsername: findUser.firstName,
                            selectedDate: `${year}-${months + 1}-${date} ${hour}:${minutes}`,
                            selectedTime: publicSessionwithUserDetails.selectedTime,
                            roomType: publicSessionwithUserDetails.RoomType,
                            detail: publicSessionwithUserDetails.started == true ? `${publicSessionwithUserDetails.countJoinUser} people joining` : `${date} ${month} ${year} ${strTime}`,
                            isLive: publicSessionwithUserDetails.started,
                            isAbleToJoin: publicSessionwithUserDetails.started,
                            cretedSessionUserphoto: findUser.photo == undefined ? "" : findUser.photo[0] ? findUser.photo[0].res : "",
                            participants: [
                                participants_1,
                                participants_2
                            ]
                        })

                    } else if (participants1Find == null && participants2Find == null && participants3Find == null) {
                        // const sessionDetail =
                        // const response = {
                        //     sessionDetail
                        // }

                        const dates = publicSessionwithUserDetails.selectedDate;
                        const finalDate = new Date(dates)
                        let month = finalDate.toLocaleString('en-us', { month: 'long' });
                        let months = finalDate.getMonth();
                        let date = finalDate.getDate();
                        let year = finalDate.getFullYear();
                        let hour = finalDate.getHours();

                        let hours = finalDate.getHours();
                        let minutes = finalDate.getMinutes();
                        let ampm = hours >= 12 ? 'pm' : 'am';
                        hours = hours % 12;
                        hours = hours ? hours : 12;
                        minutes = minutes.toString().padStart(2, '0');
                        let strTime = hours + ':' + minutes + ' ' + ampm;


                        publicSession1.push({
                            _id: publicSessionwithUserDetails._id,
                            cretedSessionUserId: findUser._id,
                            cretedSessionUsername: findUser.firstName,
                            selectedDate: `${year}-${months + 1}-${date} ${hour}:${minutes}`,
                            selectedTime: publicSessionwithUserDetails.selectedTime,
                            roomType: publicSessionwithUserDetails.RoomType,
                            detail: publicSessionwithUserDetails.started == true ? `${publicSessionwithUserDetails.countJoinUser} people joining` : `${date} ${month} ${year} ${strTime}`,
                            isLive: publicSessionwithUserDetails.started,
                            isAbleToJoin: publicSessionwithUserDetails.started,
                            cretedSessionUserphoto: findUser.photo == undefined ? "" : findUser.photo[0] ? findUser.photo[0].res : "",
                            participants: []
                        })
                    }

                }




            }


            const res1 = publicSession.sort((a, b) => new Date(a.selectedDate) - new Date(b.selectedDate))
            const response = [...res1, ...publicSession1]

            const page = parseInt(req.query.page)
            const limit = parseInt(req.query.limit)
            const startIndex = (page - 1) * limit;
            const endIndex = page * limit;
            const data = publicSession.length;
            const pageCount = Math.ceil(data / limit);
            res.status(status.OK).json({
                "message": "successfully Show All Public Session!",
                "status": true,
                "code": 200,
                "statusCode": 1,
                "pageCount": (pageCount).toString() == (NaN).toString() ? 0 : pageCount,
                "data": (startIndex).toString() == (NaN).toString() ? response : response.slice(startIndex, endIndex)

            })
        } else if (findPublicSessionParticipant2Match[0] != undefined) {

            const publicSession = [];
            const publicSession1 = [];

            for (const publicSessionwithUserDetails of findPublicSessionParticipant2) {

                const findUser = await userModel.findOne({
                    _id: publicSessionwithUserDetails.cretedSessionUser,
                    polyDating: 0
                })

                const participants1Find = await userModel.findOne({
                    _id: publicSessionwithUserDetails.participants[0].participants_1,
                    polyDating: 0
                })
                const participants2Find = await userModel.findOne({
                    _id: publicSessionwithUserDetails.participants[0].participants_2,
                    polyDating: 0
                })
                const participants3Find = await userModel.findOne({
                    _id: publicSessionwithUserDetails.participants[0].participants_3,
                    polyDating: 0
                })

                const participants_1 = {
                    _id: participants1Find ? participants1Find._id : "",
                    name: participants1Find ? participants1Find.firstName : "",
                    profile: participants1Find ? participants1Find.photo[0] ? participants1Find.photo[0].res : "" : "",
                }
                const participants_2 = {
                    _id: participants2Find ? participants2Find._id : "",
                    name: participants2Find ? participants2Find.firstName : "",
                    profile: participants2Find ? participants2Find.photo[0] ? participants2Find.photo[0].res : "" : "",
                }
                const participants_3 = {
                    _id: participants3Find ? participants3Find._id : "",
                    name: participants3Find ? participants3Find.firstName : "",
                    profile: participants3Find ? participants3Find.photo[0] ? participants3Find.photo[0].res : "" : "",
                }


                if (publicSessionwithUserDetails.sessionEndOrNot == false) {
                    if (participants1Find && participants2Find && participants3Find) {
                        // const sessionDetail = 
                        // const response = {
                        //     sessionDetail
                        // }

                        const dates = publicSessionwithUserDetails.selectedDate;
                        const finalDate = new Date(dates)
                        let month = finalDate.toLocaleString('en-us', { month: 'long' });
                        let months = finalDate.getMonth();
                        let date = finalDate.getDate();
                        let year = finalDate.getFullYear();
                        let hour = finalDate.getHours();

                        let hours = finalDate.getHours();
                        let minutes = finalDate.getMinutes();
                        let ampm = hours >= 12 ? 'pm' : 'am';
                        hours = hours % 12;
                        hours = hours ? hours : 12;
                        minutes = minutes.toString().padStart(2, '0');
                        let strTime = hours + ':' + minutes + ' ' + ampm;

                        publicSession.push({
                            _id: publicSessionwithUserDetails._id,
                            cretedSessionUserId: findUser._id,
                            cretedSessionUsername: findUser.firstName,
                            selectedDate: `${year}-${months + 1}-${date} ${hour}:${minutes}`,
                            selectedTime: publicSessionwithUserDetails.selectedTime,
                            roomType: publicSessionwithUserDetails.RoomType,
                            detail: publicSessionwithUserDetails.started == true ? `${publicSessionwithUserDetails.countJoinUser} people joining` : `${date} ${month} ${year} ${strTime}`,
                            isLive: publicSessionwithUserDetails.started,
                            isAbleToJoin: publicSessionwithUserDetails.started,
                            cretedSessionUserphoto: findUser.photo == undefined ? "" : findUser.photo[0] ? findUser.photo[0].res : "",
                            participants: [
                                participants_1,
                                participants_2,
                                participants_3
                            ]
                        })
                    } else if (participants1Find == null && participants2Find && participants3Find) {
                        // const sessionDetail = 
                        // const response = {
                        //     sessionDetail
                        // }

                        const dates = publicSessionwithUserDetails.selectedDate;
                        const finalDate = new Date(dates)
                        let month = finalDate.toLocaleString('en-us', { month: 'long' });
                        let months = finalDate.getMonth();
                        let date = finalDate.getDate();
                        let year = finalDate.getFullYear();
                        let hour = finalDate.getHours();

                        let hours = finalDate.getHours();
                        let minutes = finalDate.getMinutes();
                        let ampm = hours >= 12 ? 'pm' : 'am';
                        hours = hours % 12;
                        hours = hours ? hours : 12;
                        minutes = minutes.toString().padStart(2, '0');
                        let strTime = hours + ':' + minutes + ' ' + ampm;

                        publicSession.push({
                            _id: publicSessionwithUserDetails._id,
                            cretedSessionUserId: findUser._id,
                            cretedSessionUsername: findUser.firstName,
                            selectedDate: `${year}-${months + 1}-${date} ${hour}:${minutes}`,
                            selectedTime: publicSessionwithUserDetails.selectedTime,
                            roomType: publicSessionwithUserDetails.RoomType,
                            detail: publicSessionwithUserDetails.started == true ? `${publicSessionwithUserDetails.countJoinUser} people joining` : `${date} ${month} ${year} ${strTime}`,
                            isLive: publicSessionwithUserDetails.started,
                            isAbleToJoin: publicSessionwithUserDetails.started,
                            cretedSessionUserphoto: findUser.photo == undefined ? "" : findUser.photo[0] ? findUser.photo[0].res : "",
                            participants: [
                                participants_2,
                                participants_3
                            ]
                        })
                    } else if (participants1Find && participants2Find == null && participants3Find) {

                        const dates = publicSessionwithUserDetails.selectedDate;
                        const finalDate = new Date(dates)
                        let month = finalDate.toLocaleString('en-us', { month: 'long' });
                        let months = finalDate.getMonth();
                        let date = finalDate.getDate();
                        let year = finalDate.getFullYear();
                        let hour = finalDate.getHours();

                        let hours = finalDate.getHours();
                        let minutes = finalDate.getMinutes();
                        let ampm = hours >= 12 ? 'pm' : 'am';
                        hours = hours % 12;
                        hours = hours ? hours : 12;
                        minutes = minutes.toString().padStart(2, '0');
                        let strTime = hours + ':' + minutes + ' ' + ampm;


                        const sessionDetail = {
                            _id: publicSessionwithUserDetails._id,
                            cretedSessionUserId: findUser._id,
                            cretedSessionUsername: findUser.firstName,
                            selectedDate: `${year}-${months + 1}-${date} ${hour}:${minutes}`,
                            selectedTime: publicSessionwithUserDetails.selectedTime,
                            roomType: publicSessionwithUserDetails.RoomType,
                            detail: publicSessionwithUserDetails.started == true ? `${publicSessionwithUserDetails.countJoinUser} people joining` : `${date} ${month} ${year} ${strTime}`,
                            isLive: publicSessionwithUserDetails.started,
                            isAbleToJoin: publicSessionwithUserDetails.started,
                            cretedSessionUserphoto: findUser.photo == undefined ? "" : findUser.photo[0] ? findUser.photo[0].res : "",
                            participants: [
                                participants_1,
                                participants_3
                            ]
                        }
                        const response = {
                            sessionDetail
                        }
                        publicSession.push(response)
                    } else if (participants1Find && participants2Find && participants3Find == null) {
                        // const sessionDetail = 
                        // const response = {
                        //     sessionDetail
                        // }

                        const dates = publicSessionwithUserDetails.selectedDate;
                        const finalDate = new Date(dates)
                        let month = finalDate.toLocaleString('en-us', { month: 'long' });
                        let months = finalDate.getMonth();
                        let date = finalDate.getDate();
                        let year = finalDate.getFullYear();
                        let hour = finalDate.getHours();

                        let hours = finalDate.getHours();
                        let minutes = finalDate.getMinutes();
                        let ampm = hours >= 12 ? 'pm' : 'am';
                        hours = hours % 12;
                        hours = hours ? hours : 12;
                        minutes = minutes.toString().padStart(2, '0');
                        let strTime = hours + ':' + minutes + ' ' + ampm;



                        publicSession.push({
                            _id: publicSessionwithUserDetails._id,
                            cretedSessionUserId: findUser._id,
                            cretedSessionUsername: findUser.firstName,
                            selectedDate: `${year}-${months + 1}-${date} ${hour}:${minutes}`,
                            selectedTime: publicSessionwithUserDetails.selectedTime,
                            roomType: publicSessionwithUserDetails.RoomType,
                            detail: publicSessionwithUserDetails.started == true ? `${publicSessionwithUserDetails.countJoinUser} people joining` : `${date} ${month} ${year} ${strTime}`,
                            isLive: publicSessionwithUserDetails.started,
                            isAbleToJoin: publicSessionwithUserDetails.started,
                            cretedSessionUserphoto: findUser.photo == undefined ? "" : findUser.photo[0] ? findUser.photo[0].res : "",
                            participants: [
                                participants_1,
                                participants_2
                            ]
                        })

                    } else if (participants1Find == null && participants2Find == null && participants3Find == null) {
                        // const sessionDetail =
                        // const response = {
                        //     sessionDetail
                        // }

                        const dates = publicSessionwithUserDetails.selectedDate;
                        const finalDate = new Date(dates)
                        let month = finalDate.toLocaleString('en-us', { month: 'long' });
                        let months = finalDate.getMonth();
                        let date = finalDate.getDate();
                        let year = finalDate.getFullYear();
                        let hour = finalDate.getHours();

                        let hours = finalDate.getHours();
                        let minutes = finalDate.getMinutes();
                        let ampm = hours >= 12 ? 'pm' : 'am';
                        hours = hours % 12;
                        hours = hours ? hours : 12;
                        minutes = minutes.toString().padStart(2, '0');
                        let strTime = hours + ':' + minutes + ' ' + ampm;


                        publicSession.push({
                            _id: publicSessionwithUserDetails._id,
                            cretedSessionUserId: findUser._id,
                            cretedSessionUsername: findUser.firstName,
                            selectedDate: `${year}-${months + 1}-${date} ${hour}:${minutes}`,
                            selectedTime: publicSessionwithUserDetails.selectedTime,
                            roomType: publicSessionwithUserDetails.RoomType,
                            detail: publicSessionwithUserDetails.started == true ? `${publicSessionwithUserDetails.countJoinUser} people joining` : `${date} ${month} ${year} ${strTime}`,
                            isLive: publicSessionwithUserDetails.started,
                            isAbleToJoin: publicSessionwithUserDetails.started,
                            cretedSessionUserphoto: findUser.photo == undefined ? "" : findUser.photo[0] ? findUser.photo[0].res : "",
                            participants: []
                        })
                    }
                } else {
                    if (participants1Find && participants2Find && participants3Find) {
                        // const sessionDetail = 
                        // const response = {
                        //     sessionDetail
                        // }

                        const dates = publicSessionwithUserDetails.selectedDate;
                        const finalDate = new Date(dates)
                        let month = finalDate.toLocaleString('en-us', { month: 'long' });
                        let months = finalDate.getMonth();
                        let date = finalDate.getDate();
                        let year = finalDate.getFullYear();
                        let hour = finalDate.getHours();

                        let hours = finalDate.getHours();
                        let minutes = finalDate.getMinutes();
                        let ampm = hours >= 12 ? 'pm' : 'am';
                        hours = hours % 12;
                        hours = hours ? hours : 12;
                        minutes = minutes.toString().padStart(2, '0');
                        let strTime = hours + ':' + minutes + ' ' + ampm;

                        publicSession1.push({
                            _id: publicSessionwithUserDetails._id,
                            cretedSessionUserId: findUser._id,
                            cretedSessionUsername: findUser.firstName,
                            selectedDate: `${year}-${months + 1}-${date} ${hour}:${minutes}`,
                            selectedTime: publicSessionwithUserDetails.selectedTime,
                            roomType: publicSessionwithUserDetails.RoomType,
                            detail: publicSessionwithUserDetails.started == true ? `${publicSessionwithUserDetails.countJoinUser} people joining` : `${date} ${month} ${year} ${strTime}`,
                            isLive: publicSessionwithUserDetails.started,
                            isAbleToJoin: publicSessionwithUserDetails.started,
                            cretedSessionUserphoto: findUser.photo == undefined ? "" : findUser.photo[0] ? findUser.photo[0].res : "",
                            participants: [
                                participants_1,
                                participants_2,
                                participants_3
                            ]
                        })
                    } else if (participants1Find == null && participants2Find && participants3Find) {
                        // const sessionDetail = 
                        // const response = {
                        //     sessionDetail
                        // }

                        const dates = publicSessionwithUserDetails.selectedDate;
                        const finalDate = new Date(dates)
                        let month = finalDate.toLocaleString('en-us', { month: 'long' });
                        let months = finalDate.getMonth();
                        let date = finalDate.getDate();
                        let year = finalDate.getFullYear();
                        let hour = finalDate.getHours();

                        let hours = finalDate.getHours();
                        let minutes = finalDate.getMinutes();
                        let ampm = hours >= 12 ? 'pm' : 'am';
                        hours = hours % 12;
                        hours = hours ? hours : 12;
                        minutes = minutes.toString().padStart(2, '0');
                        let strTime = hours + ':' + minutes + ' ' + ampm;

                        publicSession1.push({
                            _id: publicSessionwithUserDetails._id,
                            cretedSessionUserId: findUser._id,
                            cretedSessionUsername: findUser.firstName,
                            selectedDate: `${year}-${months + 1}-${date} ${hour}:${minutes}`,
                            selectedTime: publicSessionwithUserDetails.selectedTime,
                            roomType: publicSessionwithUserDetails.RoomType,
                            detail: publicSessionwithUserDetails.started == true ? `${publicSessionwithUserDetails.countJoinUser} people joining` : `${date} ${month} ${year} ${strTime}`,
                            isLive: publicSessionwithUserDetails.started,
                            isAbleToJoin: publicSessionwithUserDetails.started,
                            cretedSessionUserphoto: findUser.photo == undefined ? "" : findUser.photo[0] ? findUser.photo[0].res : "",
                            participants: [
                                participants_2,
                                participants_3
                            ]
                        })
                    } else if (participants1Find && participants2Find == null && participants3Find) {

                        const dates = publicSessionwithUserDetails.selectedDate;
                        const finalDate = new Date(dates)
                        let month = finalDate.toLocaleString('en-us', { month: 'long' });
                        let months = finalDate.getMonth();
                        let date = finalDate.getDate();
                        let year = finalDate.getFullYear();
                        let hour = finalDate.getHours();

                        let hours = finalDate.getHours();
                        let minutes = finalDate.getMinutes();
                        let ampm = hours >= 12 ? 'pm' : 'am';
                        hours = hours % 12;
                        hours = hours ? hours : 12;
                        minutes = minutes.toString().padStart(2, '0');
                        let strTime = hours + ':' + minutes + ' ' + ampm;


                        const sessionDetail = {
                            _id: publicSessionwithUserDetails._id,
                            cretedSessionUserId: findUser._id,
                            cretedSessionUsername: findUser.firstName,
                            selectedDate: `${year}-${months + 1}-${date} ${hour}:${minutes}`,
                            selectedTime: publicSessionwithUserDetails.selectedTime,
                            roomType: publicSessionwithUserDetails.RoomType,
                            detail: publicSessionwithUserDetails.started == true ? `${publicSessionwithUserDetails.countJoinUser} people joining` : `${date} ${month} ${year} ${strTime}`,
                            isLive: publicSessionwithUserDetails.started,
                            isAbleToJoin: publicSessionwithUserDetails.started,
                            cretedSessionUserphoto: findUser.photo == undefined ? "" : findUser.photo[0] ? findUser.photo[0].res : "",
                            participants: [
                                participants_1,
                                participants_3
                            ]
                        }
                        const response = {
                            sessionDetail
                        }
                        publicSession1.push(response)
                    } else if (participants1Find && participants2Find && participants3Find == null) {
                        // const sessionDetail = 
                        // const response = {
                        //     sessionDetail
                        // }

                        const dates = publicSessionwithUserDetails.selectedDate;
                        const finalDate = new Date(dates)
                        let month = finalDate.toLocaleString('en-us', { month: 'long' });
                        let months = finalDate.getMonth();
                        let date = finalDate.getDate();
                        let year = finalDate.getFullYear();
                        let hour = finalDate.getHours();

                        let hours = finalDate.getHours();
                        let minutes = finalDate.getMinutes();
                        let ampm = hours >= 12 ? 'pm' : 'am';
                        hours = hours % 12;
                        hours = hours ? hours : 12;
                        minutes = minutes.toString().padStart(2, '0');
                        let strTime = hours + ':' + minutes + ' ' + ampm;



                        publicSession1.push({
                            _id: publicSessionwithUserDetails._id,
                            cretedSessionUserId: findUser._id,
                            cretedSessionUsername: findUser.firstName,
                            selectedDate: `${year}-${months + 1}-${date} ${hour}:${minutes}`,
                            selectedTime: publicSessionwithUserDetails.selectedTime,
                            roomType: publicSessionwithUserDetails.RoomType,
                            detail: publicSessionwithUserDetails.started == true ? `${publicSessionwithUserDetails.countJoinUser} people joining` : `${date} ${month} ${year} ${strTime}`,
                            isLive: publicSessionwithUserDetails.started,
                            isAbleToJoin: publicSessionwithUserDetails.started,
                            cretedSessionUserphoto: findUser.photo == undefined ? "" : findUser.photo[0] ? findUser.photo[0].res : "",
                            participants: [
                                participants_1,
                                participants_2
                            ]
                        })

                    } else if (participants1Find == null && participants2Find == null && participants3Find == null) {
                        // const sessionDetail =
                        // const response = {
                        //     sessionDetail
                        // }

                        const dates = publicSessionwithUserDetails.selectedDate;
                        const finalDate = new Date(dates)
                        let month = finalDate.toLocaleString('en-us', { month: 'long' });
                        let months = finalDate.getMonth();
                        let date = finalDate.getDate();
                        let year = finalDate.getFullYear();
                        let hour = finalDate.getHours();

                        let hours = finalDate.getHours();
                        let minutes = finalDate.getMinutes();
                        let ampm = hours >= 12 ? 'pm' : 'am';
                        hours = hours % 12;
                        hours = hours ? hours : 12;
                        minutes = minutes.toString().padStart(2, '0');
                        let strTime = hours + ':' + minutes + ' ' + ampm;


                        publicSession1.push({
                            _id: publicSessionwithUserDetails._id,
                            cretedSessionUserId: findUser._id,
                            cretedSessionUsername: findUser.firstName,
                            selectedDate: `${year}-${months + 1}-${date} ${hour}:${minutes}`,
                            selectedTime: publicSessionwithUserDetails.selectedTime,
                            roomType: publicSessionwithUserDetails.RoomType,
                            detail: publicSessionwithUserDetails.started == true ? `${publicSessionwithUserDetails.countJoinUser} people joining` : `${date} ${month} ${year} ${strTime}`,
                            isLive: publicSessionwithUserDetails.started,
                            isAbleToJoin: publicSessionwithUserDetails.started,
                            cretedSessionUserphoto: findUser.photo == undefined ? "" : findUser.photo[0] ? findUser.photo[0].res : "",
                            participants: []
                        })
                    }
                }



            }

            const res1 = publicSession.sort((a, b) => new Date(a.selectedDate) - new Date(b.selectedDate))
            const response = [...res1, ...publicSession1]

            const page = parseInt(req.query.page)
            const limit = parseInt(req.query.limit)
            const startIndex = (page - 1) * limit;
            const endIndex = page * limit;
            const data = publicSession.length;
            const pageCount = Math.ceil(data / limit);
            res.status(status.OK).json({
                "message": "successfully Show All Public Session!",
                "status": true,
                "code": 200,
                "statusCode": 1,
                "pageCount": (pageCount).toString() == (NaN).toString() ? 0 : pageCount,
                "data": (startIndex).toString() == (NaN).toString() ? response : response.slice(startIndex, endIndex)

            })
        } else if (findPublicSessionParticipant3Match[0] != undefined) {

            const publicSession = [];
            const publicSession1 = [];


            for (const publicSessionwithUserDetails of findPublicSessionParticipant3) {

                const findUser = await userModel.findOne({
                    _id: publicSessionwithUserDetails.cretedSessionUser,
                    polyDating: 0
                })

                const participants1Find = await userModel.findOne({
                    _id: publicSessionwithUserDetails.participants[0].participants_1,
                    polyDating: 0
                })
                const participants2Find = await userModel.findOne({
                    _id: publicSessionwithUserDetails.participants[0].participants_2,
                    polyDating: 0
                })
                const participants3Find = await userModel.findOne({
                    _id: publicSessionwithUserDetails.participants[0].participants_3,
                    polyDating: 0
                })

                const participants_1 = {
                    _id: participants1Find ? participants1Find._id : "",
                    name: participants1Find ? participants1Find.firstName : "",
                    profile: participants1Find ? participants1Find.photo[0] ? participants1Find.photo[0].res : "" : "",
                }
                const participants_2 = {
                    _id: participants2Find ? participants2Find._id : "",
                    name: participants2Find ? participants2Find.firstName : "",
                    profile: participants2Find ? participants2Find.photo[0] ? participants2Find.photo[0].res : "" : "",
                }
                const participants_3 = {
                    _id: participants3Find ? participants3Find._id : "",
                    name: participants3Find ? participants3Find.firstName : "",
                    profile: participants3Find ? participants3Find.photo[0] ? participants3Find.photo[0].res : "" : "",
                }

                if (publicSessionwithUserDetails.sessionEndOrNot == false) {
                    if (participants1Find && participants2Find && participants3Find) {
                        // const sessionDetail = 
                        // const response = {
                        //     sessionDetail
                        // }

                        const dates = publicSessionwithUserDetails.selectedDate;
                        const finalDate = new Date(dates)
                        let month = finalDate.toLocaleString('en-us', { month: 'long' });
                        let months = finalDate.getMonth();
                        let date = finalDate.getDate();
                        let year = finalDate.getFullYear();
                        let hour = finalDate.getHours();

                        let hours = finalDate.getHours();
                        let minutes = finalDate.getMinutes();
                        let ampm = hours >= 12 ? 'pm' : 'am';
                        hours = hours % 12;
                        hours = hours ? hours : 12;
                        minutes = minutes.toString().padStart(2, '0');
                        let strTime = hours + ':' + minutes + ' ' + ampm;

                        publicSession.push({
                            _id: publicSessionwithUserDetails._id,
                            cretedSessionUserId: findUser._id,
                            cretedSessionUsername: findUser.firstName,
                            selectedDate: `${year}-${months + 1}-${date} ${hour}:${minutes}`,
                            selectedTime: publicSessionwithUserDetails.selectedTime,
                            roomType: publicSessionwithUserDetails.RoomType,
                            detail: publicSessionwithUserDetails.started == true ? `${publicSessionwithUserDetails.countJoinUser} people joining` : `${date} ${month} ${year} ${strTime}`,
                            isLive: publicSessionwithUserDetails.started,
                            isAbleToJoin: publicSessionwithUserDetails.started,
                            cretedSessionUserphoto: findUser.photo == undefined ? "" : findUser.photo[0] ? findUser.photo[0].res : "",
                            participants: [
                                participants_1,
                                participants_2,
                                participants_3
                            ]
                        })
                    } else if (participants1Find == null && participants2Find && participants3Find) {
                        // const sessionDetail = 
                        // const response = {
                        //     sessionDetail
                        // }

                        const dates = publicSessionwithUserDetails.selectedDate;
                        const finalDate = new Date(dates)
                        let month = finalDate.toLocaleString('en-us', { month: 'long' });
                        let months = finalDate.getMonth();
                        let date = finalDate.getDate();
                        let year = finalDate.getFullYear();
                        let hour = finalDate.getHours();

                        let hours = finalDate.getHours();
                        let minutes = finalDate.getMinutes();
                        let ampm = hours >= 12 ? 'pm' : 'am';
                        hours = hours % 12;
                        hours = hours ? hours : 12;
                        minutes = minutes.toString().padStart(2, '0');
                        let strTime = hours + ':' + minutes + ' ' + ampm;

                        publicSession.push({
                            _id: publicSessionwithUserDetails._id,
                            cretedSessionUserId: findUser._id,
                            cretedSessionUsername: findUser.firstName,
                            selectedDate: `${year}-${months + 1}-${date} ${hour}:${minutes}`,
                            selectedTime: publicSessionwithUserDetails.selectedTime,
                            roomType: publicSessionwithUserDetails.RoomType,
                            detail: publicSessionwithUserDetails.started == true ? `${publicSessionwithUserDetails.countJoinUser} people joining` : `${date} ${month} ${year} ${strTime}`,
                            isLive: publicSessionwithUserDetails.started,
                            isAbleToJoin: publicSessionwithUserDetails.started,
                            cretedSessionUserphoto: findUser.photo == undefined ? "" : findUser.photo[0] ? findUser.photo[0].res : "",
                            participants: [
                                participants_2,
                                participants_3
                            ]
                        })
                    } else if (participants1Find && participants2Find == null && participants3Find) {

                        const dates = publicSessionwithUserDetails.selectedDate;
                        const finalDate = new Date(dates)
                        let month = finalDate.toLocaleString('en-us', { month: 'long' });
                        let months = finalDate.getMonth();
                        let date = finalDate.getDate();
                        let year = finalDate.getFullYear();
                        let hour = finalDate.getHours();

                        let hours = finalDate.getHours();
                        let minutes = finalDate.getMinutes();
                        let ampm = hours >= 12 ? 'pm' : 'am';
                        hours = hours % 12;
                        hours = hours ? hours : 12;
                        minutes = minutes.toString().padStart(2, '0');
                        let strTime = hours + ':' + minutes + ' ' + ampm;


                        const sessionDetail = {
                            _id: publicSessionwithUserDetails._id,
                            cretedSessionUserId: findUser._id,
                            cretedSessionUsername: findUser.firstName,
                            selectedDate: `${year}-${months + 1}-${date} ${hour}:${minutes}`,
                            selectedTime: publicSessionwithUserDetails.selectedTime,
                            roomType: publicSessionwithUserDetails.RoomType,
                            detail: publicSessionwithUserDetails.started == true ? `${publicSessionwithUserDetails.countJoinUser} people joining` : `${date} ${month} ${year} ${strTime}`,
                            isLive: publicSessionwithUserDetails.started,
                            isAbleToJoin: publicSessionwithUserDetails.started,
                            cretedSessionUserphoto: findUser.photo == undefined ? "" : findUser.photo[0] ? findUser.photo[0].res : "",
                            participants: [
                                participants_1,
                                participants_3
                            ]
                        }
                        const response = {
                            sessionDetail
                        }
                        publicSession.push(response)
                    } else if (participants1Find && participants2Find && participants3Find == null) {
                        // const sessionDetail = 
                        // const response = {
                        //     sessionDetail
                        // }

                        const dates = publicSessionwithUserDetails.selectedDate;
                        const finalDate = new Date(dates)
                        let month = finalDate.toLocaleString('en-us', { month: 'long' });
                        let months = finalDate.getMonth();
                        let date = finalDate.getDate();
                        let year = finalDate.getFullYear();
                        let hour = finalDate.getHours();

                        let hours = finalDate.getHours();
                        let minutes = finalDate.getMinutes();
                        let ampm = hours >= 12 ? 'pm' : 'am';
                        hours = hours % 12;
                        hours = hours ? hours : 12;
                        minutes = minutes.toString().padStart(2, '0');
                        let strTime = hours + ':' + minutes + ' ' + ampm;



                        publicSession.push({
                            _id: publicSessionwithUserDetails._id,
                            cretedSessionUserId: findUser._id,
                            cretedSessionUsername: findUser.firstName,
                            selectedDate: `${year}-${months + 1}-${date} ${hour}:${minutes}`,
                            selectedTime: publicSessionwithUserDetails.selectedTime,
                            roomType: publicSessionwithUserDetails.RoomType,
                            detail: publicSessionwithUserDetails.started == true ? `${publicSessionwithUserDetails.countJoinUser} people joining` : `${date} ${month} ${year} ${strTime}`,
                            isLive: publicSessionwithUserDetails.started,
                            isAbleToJoin: publicSessionwithUserDetails.started,
                            cretedSessionUserphoto: findUser.photo == undefined ? "" : findUser.photo[0] ? findUser.photo[0].res : "",
                            participants: [
                                participants_1,
                                participants_2
                            ]
                        })

                    } else if (participants1Find == null && participants2Find == null && participants3Find == null) {
                        // const sessionDetail =
                        // const response = {
                        //     sessionDetail
                        // }

                        const dates = publicSessionwithUserDetails.selectedDate;
                        const finalDate = new Date(dates)
                        let month = finalDate.toLocaleString('en-us', { month: 'long' });
                        let months = finalDate.getMonth();
                        let date = finalDate.getDate();
                        let year = finalDate.getFullYear();
                        let hour = finalDate.getHours();

                        let hours = finalDate.getHours();
                        let minutes = finalDate.getMinutes();
                        let ampm = hours >= 12 ? 'pm' : 'am';
                        hours = hours % 12;
                        hours = hours ? hours : 12;
                        minutes = minutes.toString().padStart(2, '0');
                        let strTime = hours + ':' + minutes + ' ' + ampm;


                        publicSession.push({
                            _id: publicSessionwithUserDetails._id,
                            cretedSessionUserId: findUser._id,
                            cretedSessionUsername: findUser.firstName,
                            selectedDate: `${year}-${months + 1}-${date} ${hour}:${minutes}`,
                            selectedTime: publicSessionwithUserDetails.selectedTime,
                            roomType: publicSessionwithUserDetails.RoomType,
                            detail: publicSessionwithUserDetails.started == true ? `${publicSessionwithUserDetails.countJoinUser} people joining` : `${date} ${month} ${year} ${strTime}`,
                            isLive: publicSessionwithUserDetails.started,
                            isAbleToJoin: publicSessionwithUserDetails.started,
                            cretedSessionUserphoto: findUser.photo == undefined ? "" : findUser.photo[0] ? findUser.photo[0].res : "",
                            participants: []
                        })
                    }
                } else {
                    if (participants1Find && participants2Find && participants3Find) {
                        // const sessionDetail = 
                        // const response = {
                        //     sessionDetail
                        // }

                        const dates = publicSessionwithUserDetails.selectedDate;
                        const finalDate = new Date(dates)
                        let month = finalDate.toLocaleString('en-us', { month: 'long' });
                        let months = finalDate.getMonth();
                        let date = finalDate.getDate();
                        let year = finalDate.getFullYear();
                        let hour = finalDate.getHours();

                        let hours = finalDate.getHours();
                        let minutes = finalDate.getMinutes();
                        let ampm = hours >= 12 ? 'pm' : 'am';
                        hours = hours % 12;
                        hours = hours ? hours : 12;
                        minutes = minutes.toString().padStart(2, '0');
                        let strTime = hours + ':' + minutes + ' ' + ampm;

                        publicSession1.push({
                            _id: publicSessionwithUserDetails._id,
                            cretedSessionUserId: findUser._id,
                            cretedSessionUsername: findUser.firstName,
                            selectedDate: `${year}-${months + 1}-${date} ${hour}:${minutes}`,
                            selectedTime: publicSessionwithUserDetails.selectedTime,
                            roomType: publicSessionwithUserDetails.RoomType,
                            detail: publicSessionwithUserDetails.started == true ? `${publicSessionwithUserDetails.countJoinUser} people joining` : `${date} ${month} ${year} ${strTime}`,
                            isLive: publicSessionwithUserDetails.started,
                            isAbleToJoin: publicSessionwithUserDetails.started,
                            cretedSessionUserphoto: findUser.photo == undefined ? "" : findUser.photo[0] ? findUser.photo[0].res : "",
                            participants: [
                                participants_1,
                                participants_2,
                                participants_3
                            ]
                        })
                    } else if (participants1Find == null && participants2Find && participants3Find) {
                        // const sessionDetail = 
                        // const response = {
                        //     sessionDetail
                        // }

                        const dates = publicSessionwithUserDetails.selectedDate;
                        const finalDate = new Date(dates)
                        let month = finalDate.toLocaleString('en-us', { month: 'long' });
                        let months = finalDate.getMonth();
                        let date = finalDate.getDate();
                        let year = finalDate.getFullYear();
                        let hour = finalDate.getHours();

                        let hours = finalDate.getHours();
                        let minutes = finalDate.getMinutes();
                        let ampm = hours >= 12 ? 'pm' : 'am';
                        hours = hours % 12;
                        hours = hours ? hours : 12;
                        minutes = minutes.toString().padStart(2, '0');
                        let strTime = hours + ':' + minutes + ' ' + ampm;

                        publicSession1.push({
                            _id: publicSessionwithUserDetails._id,
                            cretedSessionUserId: findUser._id,
                            cretedSessionUsername: findUser.firstName,
                            selectedDate: `${year}-${months + 1}-${date} ${hour}:${minutes}`,
                            selectedTime: publicSessionwithUserDetails.selectedTime,
                            roomType: publicSessionwithUserDetails.RoomType,
                            detail: publicSessionwithUserDetails.started == true ? `${publicSessionwithUserDetails.countJoinUser} people joining` : `${date} ${month} ${year} ${strTime}`,
                            isLive: publicSessionwithUserDetails.started,
                            isAbleToJoin: publicSessionwithUserDetails.started,
                            cretedSessionUserphoto: findUser.photo == undefined ? "" : findUser.photo[0] ? findUser.photo[0].res : "",
                            participants: [
                                participants_2,
                                participants_3
                            ]
                        })
                    } else if (participants1Find && participants2Find == null && participants3Find) {

                        const dates = publicSessionwithUserDetails.selectedDate;
                        const finalDate = new Date(dates)
                        let month = finalDate.toLocaleString('en-us', { month: 'long' });
                        let months = finalDate.getMonth();
                        let date = finalDate.getDate();
                        let year = finalDate.getFullYear();
                        let hour = finalDate.getHours();

                        let hours = finalDate.getHours();
                        let minutes = finalDate.getMinutes();
                        let ampm = hours >= 12 ? 'pm' : 'am';
                        hours = hours % 12;
                        hours = hours ? hours : 12;
                        minutes = minutes.toString().padStart(2, '0');
                        let strTime = hours + ':' + minutes + ' ' + ampm;


                        const sessionDetail = {
                            _id: publicSessionwithUserDetails._id,
                            cretedSessionUserId: findUser._id,
                            cretedSessionUsername: findUser.firstName,
                            selectedDate: `${year}-${months + 1}-${date} ${hour}:${minutes}`,
                            selectedTime: publicSessionwithUserDetails.selectedTime,
                            roomType: publicSessionwithUserDetails.RoomType,
                            detail: publicSessionwithUserDetails.started == true ? `${publicSessionwithUserDetails.countJoinUser} people joining` : `${date} ${month} ${year} ${strTime}`,
                            isLive: publicSessionwithUserDetails.started,
                            isAbleToJoin: publicSessionwithUserDetails.started,
                            cretedSessionUserphoto: findUser.photo == undefined ? "" : findUser.photo[0] ? findUser.photo[0].res : "",
                            participants: [
                                participants_1,
                                participants_3
                            ]
                        }
                        const response = {
                            sessionDetail
                        }
                        publicSession1.push(response)
                    } else if (participants1Find && participants2Find && participants3Find == null) {
                        // const sessionDetail = 
                        // const response = {
                        //     sessionDetail
                        // }

                        const dates = publicSessionwithUserDetails.selectedDate;
                        const finalDate = new Date(dates)
                        let month = finalDate.toLocaleString('en-us', { month: 'long' });
                        let months = finalDate.getMonth();
                        let date = finalDate.getDate();
                        let year = finalDate.getFullYear();
                        let hour = finalDate.getHours();

                        let hours = finalDate.getHours();
                        let minutes = finalDate.getMinutes();
                        let ampm = hours >= 12 ? 'pm' : 'am';
                        hours = hours % 12;
                        hours = hours ? hours : 12;
                        minutes = minutes.toString().padStart(2, '0');
                        let strTime = hours + ':' + minutes + ' ' + ampm;



                        publicSession1.push({
                            _id: publicSessionwithUserDetails._id,
                            cretedSessionUserId: findUser._id,
                            cretedSessionUsername: findUser.firstName,
                            selectedDate: `${year}-${months + 1}-${date} ${hour}:${minutes}`,
                            selectedTime: publicSessionwithUserDetails.selectedTime,
                            roomType: publicSessionwithUserDetails.RoomType,
                            detail: publicSessionwithUserDetails.started == true ? `${publicSessionwithUserDetails.countJoinUser} people joining` : `${date} ${month} ${year} ${strTime}`,
                            isLive: publicSessionwithUserDetails.started,
                            isAbleToJoin: publicSessionwithUserDetails.started,
                            cretedSessionUserphoto: findUser.photo == undefined ? "" : findUser.photo[0] ? findUser.photo[0].res : "",
                            participants: [
                                participants_1,
                                participants_2
                            ]
                        })

                    } else if (participants1Find == null && participants2Find == null && participants3Find == null) {
                        // const sessionDetail =
                        // const response = {
                        //     sessionDetail
                        // }

                        const dates = publicSessionwithUserDetails.selectedDate;
                        const finalDate = new Date(dates)
                        let month = finalDate.toLocaleString('en-us', { month: 'long' });
                        let months = finalDate.getMonth();
                        let date = finalDate.getDate();
                        let year = finalDate.getFullYear();
                        let hour = finalDate.getHours();

                        let hours = finalDate.getHours();
                        let minutes = finalDate.getMinutes();
                        let ampm = hours >= 12 ? 'pm' : 'am';
                        hours = hours % 12;
                        hours = hours ? hours : 12;
                        minutes = minutes.toString().padStart(2, '0');
                        let strTime = hours + ':' + minutes + ' ' + ampm;


                        publicSession1.push({
                            _id: publicSessionwithUserDetails._id,
                            cretedSessionUserId: findUser._id,
                            cretedSessionUsername: findUser.firstName,
                            selectedDate: `${year}-${months + 1}-${date} ${hour}:${minutes}`,
                            selectedTime: publicSessionwithUserDetails.selectedTime,
                            roomType: publicSessionwithUserDetails.RoomType,
                            detail: publicSessionwithUserDetails.started == true ? `${publicSessionwithUserDetails.countJoinUser} people joining` : `${date} ${month} ${year} ${strTime}`,
                            isLive: publicSessionwithUserDetails.started,
                            isAbleToJoin: publicSessionwithUserDetails.started,
                            cretedSessionUserphoto: findUser.photo == undefined ? "" : findUser.photo[0] ? findUser.photo[0].res : "",
                            participants: []
                        })
                    }
                }

            }

            const res1 = publicSession.sort((a, b) => new Date(a.selectedDate) - new Date(b.selectedDate))
            const response = [...res1, ...publicSession1]

            const page = parseInt(req.query.page)
            const limit = parseInt(req.query.limit)
            const startIndex = (page - 1) * limit;
            const endIndex = page * limit;
            const data = publicSession.length;
            const pageCount = Math.ceil(data / limit);
            res.status(status.OK).json({
                "message": "successfully Show All Public Session!",
                "status": true,
                "code": 200,
                "statusCode": 1,
                "pageCount": (pageCount).toString() == (NaN).toString() ? 0 : pageCount,
                "data": (startIndex).toString() == (NaN).toString() ? response : response.slice(startIndex, endIndex)

            })
        } else if (findPublicAll) {

            const publicSession = [];
            const publicSession1 = [];

            for (const publicSessionwithUserDetails of findPublicAll) {

                const findUser = await userModel.findOne({
                    _id: publicSessionwithUserDetails.cretedSessionUser,
                    polyDating: 0
                })

                const participants1Find = await userModel.findOne({
                    _id: publicSessionwithUserDetails.participants[0].participants_1,
                    polyDating: 0
                })
                const participants2Find = await userModel.findOne({
                    _id: publicSessionwithUserDetails.participants[0].participants_2,
                    polyDating: 0
                })
                const participants3Find = await userModel.findOne({
                    _id: publicSessionwithUserDetails.participants[0].participants_3,
                    polyDating: 0
                })

                const participants_1 = {
                    _id: participants1Find ? participants1Find._id : "",
                    name: participants1Find ? participants1Find.firstName : "",
                    profile: participants1Find ? participants1Find.photo[0] ? participants1Find.photo[0].res : "" : "",
                }
                const participants_2 = {
                    _id: participants2Find ? participants2Find._id : "",
                    name: participants2Find ? participants2Find.firstName : "",
                    profile: participants2Find ? participants2Find.photo[0] ? participants2Find.photo[0].res : "" : "",
                }
                const participants_3 = {
                    _id: participants3Find ? participants3Find._id : "",
                    name: participants3Find ? participants3Find.firstName : "",
                    profile: participants3Find ? participants3Find.photo[0] ? participants3Find.photo[0].res : "" : "",
                }

                if (publicSessionwithUserDetails.sessionEndOrNot == false) {

                    if (participants1Find && participants2Find && participants3Find) {
                        // const sessionDetail = 
                        // const response = {
                        //     sessionDetail
                        // }

                        const dates = publicSessionwithUserDetails.selectedDate;
                        const finalDate = new Date(dates)
                        let month = finalDate.toLocaleString('en-us', { month: 'long' });
                        let months = finalDate.getMonth();
                        let date = finalDate.getDate();
                        let year = finalDate.getFullYear();
                        let hour = finalDate.getHours();

                        let hours = finalDate.getHours();
                        let minutes = finalDate.getMinutes();
                        let ampm = hours >= 12 ? 'pm' : 'am';
                        hours = hours % 12;
                        hours = hours ? hours : 12;
                        minutes = minutes.toString().padStart(2, '0');
                        let strTime = hours + ':' + minutes + ' ' + ampm;

                        publicSession.push({
                            _id: publicSessionwithUserDetails._id,
                            cretedSessionUserId: findUser._id,
                            cretedSessionUsername: findUser.firstName,
                            selectedDate: `${year}-${months + 1}-${date} ${hour}:${minutes}`,
                            selectedTime: publicSessionwithUserDetails.selectedTime,
                            roomType: publicSessionwithUserDetails.RoomType,
                            detail: publicSessionwithUserDetails.started == true ? `${publicSessionwithUserDetails.countJoinUser} people joining` : `${date} ${month} ${year} ${strTime}`,
                            isLive: publicSessionwithUserDetails.started,
                            isAbleToJoin: publicSessionwithUserDetails.started,
                            cretedSessionUserphoto: findUser.photo == undefined ? "" : findUser.photo[0] ? findUser.photo[0].res : "",
                            participants: [
                                participants_1,
                                participants_2,
                                participants_3
                            ]
                        })
                    } else if (participants1Find == null && participants2Find && participants3Find) {
                        // const sessionDetail = 
                        // const response = {
                        //     sessionDetail
                        // }

                        const dates = publicSessionwithUserDetails.selectedDate;
                        const finalDate = new Date(dates)
                        let month = finalDate.toLocaleString('en-us', { month: 'long' });
                        let months = finalDate.getMonth();
                        let date = finalDate.getDate();
                        let year = finalDate.getFullYear();
                        let hour = finalDate.getHours();

                        let hours = finalDate.getHours();
                        let minutes = finalDate.getMinutes();
                        let ampm = hours >= 12 ? 'pm' : 'am';
                        hours = hours % 12;
                        hours = hours ? hours : 12;
                        minutes = minutes.toString().padStart(2, '0');
                        let strTime = hours + ':' + minutes + ' ' + ampm;

                        publicSession.push({
                            _id: publicSessionwithUserDetails._id,
                            cretedSessionUserId: findUser._id,
                            cretedSessionUsername: findUser.firstName,
                            selectedDate: `${year}-${months + 1}-${date} ${hour}:${minutes}`,
                            selectedTime: publicSessionwithUserDetails.selectedTime,
                            roomType: publicSessionwithUserDetails.RoomType,
                            detail: publicSessionwithUserDetails.started == true ? `${publicSessionwithUserDetails.countJoinUser} people joining` : `${date} ${month} ${year} ${strTime}`,
                            isLive: publicSessionwithUserDetails.started,
                            isAbleToJoin: publicSessionwithUserDetails.started,
                            cretedSessionUserphoto: findUser.photo == undefined ? "" : findUser.photo[0] ? findUser.photo[0].res : "",
                            participants: [
                                participants_2,
                                participants_3
                            ]
                        })
                    } else if (participants1Find && participants2Find == null && participants3Find) {

                        const dates = publicSessionwithUserDetails.selectedDate;
                        const finalDate = new Date(dates)
                        let month = finalDate.toLocaleString('en-us', { month: 'long' });
                        let months = finalDate.getMonth();
                        let date = finalDate.getDate();
                        let year = finalDate.getFullYear();
                        let hour = finalDate.getHours();

                        let hours = finalDate.getHours();
                        let minutes = finalDate.getMinutes();
                        let ampm = hours >= 12 ? 'pm' : 'am';
                        hours = hours % 12;
                        hours = hours ? hours : 12;
                        minutes = minutes.toString().padStart(2, '0');
                        let strTime = hours + ':' + minutes + ' ' + ampm;


                        const sessionDetail = {
                            _id: publicSessionwithUserDetails._id,
                            cretedSessionUserId: findUser._id,
                            cretedSessionUsername: findUser.firstName,
                            selectedDate: `${year}-${months + 1}-${date} ${hour}:${minutes}`,
                            selectedTime: publicSessionwithUserDetails.selectedTime,
                            roomType: publicSessionwithUserDetails.RoomType,
                            detail: publicSessionwithUserDetails.started == true ? `${publicSessionwithUserDetails.countJoinUser} people joining` : `${date} ${month} ${year} ${strTime}`,
                            isLive: publicSessionwithUserDetails.started,
                            isAbleToJoin: publicSessionwithUserDetails.started,
                            cretedSessionUserphoto: findUser.photo == undefined ? "" : findUser.photo[0] ? findUser.photo[0].res : "",
                            participants: [
                                participants_1,
                                participants_3
                            ]
                        }
                        const response = {
                            sessionDetail
                        }
                        publicSession.push(response)
                    } else if (participants1Find && participants2Find && participants3Find == null) {
                        // const sessionDetail = 
                        // const response = {
                        //     sessionDetail
                        // }

                        const dates = publicSessionwithUserDetails.selectedDate;
                        const finalDate = new Date(dates)
                        let month = finalDate.toLocaleString('en-us', { month: 'long' });
                        let months = finalDate.getMonth();
                        let date = finalDate.getDate();
                        let year = finalDate.getFullYear();
                        let hour = finalDate.getHours();

                        let hours = finalDate.getHours();
                        let minutes = finalDate.getMinutes();
                        let ampm = hours >= 12 ? 'pm' : 'am';
                        hours = hours % 12;
                        hours = hours ? hours : 12;
                        minutes = minutes.toString().padStart(2, '0');
                        let strTime = hours + ':' + minutes + ' ' + ampm;



                        publicSession.push({
                            _id: publicSessionwithUserDetails._id,
                            cretedSessionUserId: findUser._id,
                            cretedSessionUsername: findUser.firstName,
                            selectedDate: `${year}-${months + 1}-${date} ${hour}:${minutes}`,
                            selectedTime: publicSessionwithUserDetails.selectedTime,
                            roomType: publicSessionwithUserDetails.RoomType,
                            detail: publicSessionwithUserDetails.started == true ? `${publicSessionwithUserDetails.countJoinUser} people joining` : `${date} ${month} ${year} ${strTime}`,
                            isLive: publicSessionwithUserDetails.started,
                            isAbleToJoin: publicSessionwithUserDetails.started,
                            cretedSessionUserphoto: findUser.photo == undefined ? "" : findUser.photo[0] ? findUser.photo[0].res : "",
                            participants: [
                                participants_1,
                                participants_2
                            ]
                        })

                    } else if (participants1Find == null && participants2Find == null && participants3Find == null) {
                        // const sessionDetail =
                        // const response = {
                        //     sessionDetail
                        // }

                        const dates = publicSessionwithUserDetails.selectedDate;
                        const finalDate = new Date(dates)
                        let month = finalDate.toLocaleString('en-us', { month: 'long' });
                        let months = finalDate.getMonth();
                        let date = finalDate.getDate();
                        let year = finalDate.getFullYear();
                        let hour = finalDate.getHours();

                        let hours = finalDate.getHours();
                        let minutes = finalDate.getMinutes();
                        let ampm = hours >= 12 ? 'pm' : 'am';
                        hours = hours % 12;
                        hours = hours ? hours : 12;
                        minutes = minutes.toString().padStart(2, '0');
                        let strTime = hours + ':' + minutes + ' ' + ampm;


                        publicSession.push({
                            _id: publicSessionwithUserDetails._id,
                            cretedSessionUserId: findUser._id,
                            cretedSessionUsername: findUser.firstName,
                            selectedDate: `${year}-${months + 1}-${date} ${hour}:${minutes}`,
                            selectedTime: publicSessionwithUserDetails.selectedTime,
                            roomType: publicSessionwithUserDetails.RoomType,
                            detail: publicSessionwithUserDetails.started == true ? `${publicSessionwithUserDetails.countJoinUser} people joining` : `${date} ${month} ${year} ${strTime}`,
                            isLive: publicSessionwithUserDetails.started,
                            isAbleToJoin: publicSessionwithUserDetails.started,
                            cretedSessionUserphoto: findUser.photo == undefined ? "" : findUser.photo[0] ? findUser.photo[0].res : "",
                            participants: []
                        })
                    }
                } else {

                    if (participants1Find && participants2Find && participants3Find) {
                        // const sessionDetail = 
                        // const response = {
                        //     sessionDetail
                        // }

                        const dates = publicSessionwithUserDetails.selectedDate;
                        const finalDate = new Date(dates)
                        let month = finalDate.toLocaleString('en-us', { month: 'long' });
                        let months = finalDate.getMonth();
                        let date = finalDate.getDate();
                        let year = finalDate.getFullYear();
                        let hour = finalDate.getHours();

                        let hours = finalDate.getHours();
                        let minutes = finalDate.getMinutes();
                        let ampm = hours >= 12 ? 'pm' : 'am';
                        hours = hours % 12;
                        hours = hours ? hours : 12;
                        minutes = minutes.toString().padStart(2, '0');
                        let strTime = hours + ':' + minutes + ' ' + ampm;

                        publicSession1.push({
                            _id: publicSessionwithUserDetails._id,
                            cretedSessionUserId: findUser._id,
                            cretedSessionUsername: findUser.firstName,
                            selectedDate: `${year}-${months + 1}-${date} ${hour}:${minutes}`,
                            selectedTime: publicSessionwithUserDetails.selectedTime,
                            roomType: publicSessionwithUserDetails.RoomType,
                            detail: publicSessionwithUserDetails.started == true ? `${publicSessionwithUserDetails.countJoinUser} people joining` : `${date} ${month} ${year} ${strTime}`,
                            isLive: publicSessionwithUserDetails.started,
                            isAbleToJoin: publicSessionwithUserDetails.started,
                            cretedSessionUserphoto: findUser.photo == undefined ? "" : findUser.photo[0] ? findUser.photo[0].res : "",
                            participants: [
                                participants_1,
                                participants_2,
                                participants_3
                            ]
                        })
                    } else if (participants1Find == null && participants2Find && participants3Find) {
                        // const sessionDetail = 
                        // const response = {
                        //     sessionDetail
                        // }

                        const dates = publicSessionwithUserDetails.selectedDate;
                        const finalDate = new Date(dates)
                        let month = finalDate.toLocaleString('en-us', { month: 'long' });
                        let months = finalDate.getMonth();
                        let date = finalDate.getDate();
                        let year = finalDate.getFullYear();
                        let hour = finalDate.getHours();

                        let hours = finalDate.getHours();
                        let minutes = finalDate.getMinutes();
                        let ampm = hours >= 12 ? 'pm' : 'am';
                        hours = hours % 12;
                        hours = hours ? hours : 12;
                        minutes = minutes.toString().padStart(2, '0');
                        let strTime = hours + ':' + minutes + ' ' + ampm;

                        publicSession1.push({
                            _id: publicSessionwithUserDetails._id,
                            cretedSessionUserId: findUser._id,
                            cretedSessionUsername: findUser.firstName,
                            selectedDate: `${year}-${months + 1}-${date} ${hour}:${minutes}`,
                            selectedTime: publicSessionwithUserDetails.selectedTime,
                            roomType: publicSessionwithUserDetails.RoomType,
                            detail: publicSessionwithUserDetails.started == true ? `${publicSessionwithUserDetails.countJoinUser} people joining` : `${date} ${month} ${year} ${strTime}`,
                            isLive: publicSessionwithUserDetails.started,
                            isAbleToJoin: publicSessionwithUserDetails.started,
                            cretedSessionUserphoto: findUser.photo == undefined ? "" : findUser.photo[0] ? findUser.photo[0].res : "",
                            participants: [
                                participants_2,
                                participants_3
                            ]
                        })
                    } else if (participants1Find && participants2Find == null && participants3Find) {

                        const dates = publicSessionwithUserDetails.selectedDate;
                        const finalDate = new Date(dates)
                        let month = finalDate.toLocaleString('en-us', { month: 'long' });
                        let months = finalDate.getMonth();
                        let date = finalDate.getDate();
                        let year = finalDate.getFullYear();
                        let hour = finalDate.getHours();

                        let hours = finalDate.getHours();
                        let minutes = finalDate.getMinutes();
                        let ampm = hours >= 12 ? 'pm' : 'am';
                        hours = hours % 12;
                        hours = hours ? hours : 12;
                        minutes = minutes.toString().padStart(2, '0');
                        let strTime = hours + ':' + minutes + ' ' + ampm;


                        const sessionDetail = {
                            _id: publicSessionwithUserDetails._id,
                            cretedSessionUserId: findUser._id,
                            cretedSessionUsername: findUser.firstName,
                            selectedDate: `${year}-${months + 1}-${date} ${hour}:${minutes}`,
                            selectedTime: publicSessionwithUserDetails.selectedTime,
                            roomType: publicSessionwithUserDetails.RoomType,
                            detail: publicSessionwithUserDetails.started == true ? `${publicSessionwithUserDetails.countJoinUser} people joining` : `${date} ${month} ${year} ${strTime}`,
                            isLive: publicSessionwithUserDetails.started,
                            isAbleToJoin: publicSessionwithUserDetails.started,
                            cretedSessionUserphoto: findUser.photo == undefined ? "" : findUser.photo[0] ? findUser.photo[0].res : "",
                            participants: [
                                participants_1,
                                participants_3
                            ]
                        }
                        const response = {
                            sessionDetail
                        }
                        publicSession1.push(response)
                    } else if (participants1Find && participants2Find && participants3Find == null) {
                        // const sessionDetail = 
                        // const response = {
                        //     sessionDetail
                        // }

                        const dates = publicSessionwithUserDetails.selectedDate;
                        const finalDate = new Date(dates)
                        let month = finalDate.toLocaleString('en-us', { month: 'long' });
                        let months = finalDate.getMonth();
                        let date = finalDate.getDate();
                        let year = finalDate.getFullYear();
                        let hour = finalDate.getHours();

                        let hours = finalDate.getHours();
                        let minutes = finalDate.getMinutes();
                        let ampm = hours >= 12 ? 'pm' : 'am';
                        hours = hours % 12;
                        hours = hours ? hours : 12;
                        minutes = minutes.toString().padStart(2, '0');
                        let strTime = hours + ':' + minutes + ' ' + ampm;



                        publicSession1.push({
                            _id: publicSessionwithUserDetails._id,
                            cretedSessionUserId: findUser._id,
                            cretedSessionUsername: findUser.firstName,
                            selectedDate: `${year}-${months + 1}-${date} ${hour}:${minutes}`,
                            selectedTime: publicSessionwithUserDetails.selectedTime,
                            roomType: publicSessionwithUserDetails.RoomType,
                            detail: publicSessionwithUserDetails.started == true ? `${publicSessionwithUserDetails.countJoinUser} people joining` : `${date} ${month} ${year} ${strTime}`,
                            isLive: publicSessionwithUserDetails.started,
                            isAbleToJoin: publicSessionwithUserDetails.started,
                            cretedSessionUserphoto: findUser.photo == undefined ? "" : findUser.photo[0] ? findUser.photo[0].res : "",
                            participants: [
                                participants_1,
                                participants_2
                            ]
                        })

                    } else if (participants1Find == null && participants2Find == null && participants3Find == null) {
                        // const sessionDetail =
                        // const response = {
                        //     sessionDetail
                        // }

                        const dates = publicSessionwithUserDetails.selectedDate;
                        const finalDate = new Date(dates)
                        let month = finalDate.toLocaleString('en-us', { month: 'long' });
                        let months = finalDate.getMonth();
                        let date = finalDate.getDate();
                        let year = finalDate.getFullYear();
                        let hour = finalDate.getHours();

                        let hours = finalDate.getHours();
                        let minutes = finalDate.getMinutes();
                        let ampm = hours >= 12 ? 'pm' : 'am';
                        hours = hours % 12;
                        hours = hours ? hours : 12;
                        minutes = minutes.toString().padStart(2, '0');
                        let strTime = hours + ':' + minutes + ' ' + ampm;


                        publicSession1.push({
                            _id: publicSessionwithUserDetails._id,
                            cretedSessionUserId: findUser._id,
                            cretedSessionUsername: findUser.firstName,
                            selectedDate: `${year}-${months + 1}-${date} ${hour}:${minutes}`,
                            selectedTime: publicSessionwithUserDetails.selectedTime,
                            roomType: publicSessionwithUserDetails.RoomType,
                            detail: publicSessionwithUserDetails.started == true ? `${publicSessionwithUserDetails.countJoinUser} people joining` : `${date} ${month} ${year} ${strTime}`,
                            isLive: publicSessionwithUserDetails.started,
                            isAbleToJoin: publicSessionwithUserDetails.started,
                            cretedSessionUserphoto: findUser.photo == undefined ? "" : findUser.photo[0] ? findUser.photo[0].res : "",
                            participants: []
                        })
                    }
                }



            }

            const res1 = publicSession.sort((a, b) => new Date(a.selectedDate) - new Date(b.selectedDate))
            const response = [...res1, ...publicSession1]

            const page = parseInt(req.query.page)
            const limit = parseInt(req.query.limit)
            const startIndex = (page - 1) * limit;
            const endIndex = page * limit;
            const data = publicSession.length;
            const pageCount = Math.ceil(data / limit);
            res.status(status.OK).json({
                "message": "successfully Show All Public Session!",
                "status": true,
                "code": 200,
                "statusCode": 1,
                "pageCount": (pageCount).toString() == (NaN).toString() ? 0 : pageCount,
                "data": (startIndex).toString() == (NaN).toString() ? response : response.slice(startIndex, endIndex)

            })
        } else {
            res.status(status.OK).json({
                "message": "Not Found Any Public Session",
                "status": true,
                "code": 200,
                "statusCode": 1,
                "pageCount": 0,
                "data": []

            })
        }

    } catch (error) {
        console.log("error", error);
        res.status(status.INTERNAL_SERVER_ERROR).json(
            new APIResponse("Something Went Wrong", "false", 500, "0", error.message)
        )
    }
}

exports.invitedInSession = async (req, res, next) => {
    try {

        const allInvited = [];
        const allInvited1 = [];
        const findMyIdInSession = await sessionModel.find({})


        for (const findInvited of findMyIdInSession) {

            if (findInvited.sessionEndOrNot == false) {
                if (findInvited.participants[0].participants_1 == req.params.user_id) {


                    const dateAll = new Date(findInvited.selectedDate)

                    let months = dateAll.getMonth();
                    let date = dateAll.getDate();
                    let year = dateAll.getFullYear();
                    let hour = dateAll.getHours();
                    let minutes = dateAll.getMinutes();
                    const createdSessionUser = await userModel.findOne({
                        _id: findInvited.cretedSessionUser,
                        polyDating: 0
                    })

                    const participants_2 = await userModel.findOne({
                        _id: findInvited.participants[0].participants_2,
                        polyDating: 0
                    })
                    const participants_3 = await userModel.findOne({
                        _id: findInvited.participants[0].participants_3,
                        polyDating: 0
                    })

                    if (participants_2 == null && participants_3) {
                        const createdSessionUserDetail = {
                            _id: findInvited._id,
                            cretedSessionUserId: createdSessionUser._id,
                            cretedSessionUsername: createdSessionUser.firstName,
                            isLive: findInvited.started,
                            isAbleToJoin: findInvited.started,
                            RoomType: findInvited.RoomType,
                            selectedTime: findInvited.selectedTime,
                            selectedDate: `${year}-${months + 1}-${date} ${hour}:${minutes}`,
                            cretedSessionUserphoto: createdSessionUser.photo ? createdSessionUser.photo[0].res : "",
                            participants: [{
                                _id: participants_3 == null ? "" : participants_3._id,
                                photo: participants_3.photo ? participants_3.photo[0].res : "",
                                name: participants_3 == null ? "" : participants_3.firstName
                            }]
                        }
                        allInvited.push(createdSessionUserDetail)
                    } else if (participants_3 == null && participants_2) {
                        const createdSessionUserDetail = {
                            _id: findInvited._id,
                            cretedSessionUserId: createdSessionUser._id,
                            cretedSessionUsername: createdSessionUser.firstName,
                            isLive: findInvited.started,
                            isAbleToJoin: findInvited.started,
                            RoomType: findInvited.RoomType,
                            selectedTime: findInvited.selectedTime,
                            selectedDate: `${year}-${months}-${date} ${hour}:${minutes}`,
                            cretedSessionUserphoto: createdSessionUser.photo ? createdSessionUser.photo[0].res : "",
                            participants: [{
                                _id: participants_2 == null ? "" : participants_2._id,
                                photo: participants_2.photo ? participants_2.photo[0].res : "",
                                name: participants_2 == null ? "" : participants_2.firstName
                            }]
                        }
                        allInvited.push(createdSessionUserDetail)
                    } else if (participants_2 && participants_3) {
                        const createdSessionUserDetail = {
                            _id: findInvited._id,
                            cretedSessionUserId: createdSessionUser._id,
                            cretedSessionUsername: createdSessionUser.firstName,
                            isLive: findInvited.started,
                            isAbleToJoin: findInvited.started,
                            RoomType: findInvited.RoomType,
                            selectedTime: findInvited.selectedTime,
                            selectedDate: `${year}-${months}-${date} ${hour}:${minutes}`,
                            cretedSessionUserphoto: createdSessionUser.photo ? createdSessionUser.photo[0].res : "",
                            participants: [{
                                _id: participants_2 == null ? "" : participants_2._id,
                                photo: participants_2.photo ? participants_2.photo[0].res : "",
                                name: participants_2 == null ? "" : participants_2.firstName
                            },
                            {
                                _id: participants_3 == null ? "" : participants_3._id,
                                photo: participants_3.photo ? participants_3.photo[0].res : "",
                                name: participants_3 == null ? "" : participants_3.firstName
                            }]
                        }
                        allInvited.push(createdSessionUserDetail)
                    } else if (participants_2 == null && participants_3 == null) {
                        const createdSessionUserDetail = {
                            _id: findInvited._id,
                            cretedSessionUserId: createdSessionUser._id,
                            cretedSessionUsername: createdSessionUser.firstName,
                            isLive: findInvited.started,
                            isAbleToJoin: findInvited.started,
                            RoomType: findInvited.RoomType,
                            selectedTime: findInvited.selectedTime,
                            selectedDate: `${year}-${months}-${date} ${hour}:${minutes}`,
                            cretedSessionUserphoto: createdSessionUser.photo ? createdSessionUser.photo[0].res : "",
                            participants: []
                        }
                        allInvited.push(createdSessionUserDetail)
                    }

                } else if (findInvited.participants[0].participants_2 == req.params.user_id) {

                    const dateAll = new Date(findInvited.selectedDate)

                    let months = dateAll.getMonth();
                    let date = dateAll.getDate();
                    let year = dateAll.getFullYear();
                    let hour = dateAll.getHours();
                    let minutes = dateAll.getMinutes();

                    const createdSessionUser = await userModel.findOne({
                        _id: findInvited.cretedSessionUser,
                        polyDating: 0
                    })
                    const participants_1 = await userModel.findOne({
                        _id: findInvited.participants[0].participants_1,
                        polyDating: 0
                    })
                    const participants_3 = await userModel.findOne({
                        _id: findInvited.participants[0].participants_3,
                        polyDating: 0
                    })

                    if (participants_1 == null && participants_3) {
                        const createdSessionUserDetail = {
                            _id: findInvited._id,
                            cretedSessionUserId: createdSessionUser._id,
                            cretedSessionUsername: createdSessionUser.firstName,
                            isLive: findInvited.started,
                            isAbleToJoin: findInvited.started,
                            RoomType: findInvited.RoomType,
                            selectedTime: findInvited.selectedTime,
                            selectedDate: `${year}-${months + 1}-${date} ${hour}:${minutes}`,
                            cretedSessionUserphoto: createdSessionUser.photo ? createdSessionUser.photo[0].res : "",
                            participants: [{
                                _id: participants_3 == null ? "" : participants_3._id,
                                photo: participants_3.photo ? participants_3.photo[0].res : "",
                                name: participants_3 == null ? "" : participants_3.firstName
                            }]
                        }
                        allInvited.push(createdSessionUserDetail)
                    } else if (participants_3 == null && participants_1) {
                        const createdSessionUserDetail = {
                            _id: findInvited._id,
                            cretedSessionUserId: createdSessionUser._id,
                            cretedSessionUsername: createdSessionUser.firstName,
                            isLive: findInvited.started,
                            isAbleToJoin: findInvited.started,
                            RoomType: findInvited.RoomType,
                            selectedTime: findInvited.selectedTime,
                            selectedDate: `${year}-${months}-${date} ${hour}:${minutes}`,
                            cretedSessionUserphoto: createdSessionUser.photo ? createdSessionUser.photo[0].res : "",
                            participants: [{
                                _id: participants_1 == null ? "" : participants_1._id,
                                photo: participants_1.photo ? participants_1.photo[0].res : "",
                                name: participants_1 == null ? "" : participants_1.firstName
                            }]
                        }
                        allInvited.push(createdSessionUserDetail)

                    } else if (participants_1 && participants_3) {
                        const createdSessionUserDetail = {
                            _id: findInvited._id,
                            cretedSessionUserId: createdSessionUser._id,
                            cretedSessionUsername: createdSessionUser.firstName,
                            isLive: findInvited.started,
                            isAbleToJoin: findInvited.started,
                            RoomType: findInvited.RoomType,
                            selectedTime: findInvited.selectedTime,
                            selectedDate: `${year}-${months}-${date} ${hour}:${minutes}`,
                            cretedSessionUserphoto: createdSessionUser.photo ? createdSessionUser.photo[0].res : "",
                            participants: [{
                                _id: participants_1 == null ? "" : participants_1._id,
                                photo: participants_1.photo ? participants_1.photo[0].res : "",
                                name: participants_1 == null ? "" : participants_1.firstName
                            }, {
                                _id: participants_3 == null ? "" : participants_3._id,
                                photo: participants_3.photo ? participants_3.photo[0].res : "",
                                name: participants_3 == null ? "" : participants_3.firstName
                            }]
                        }
                        allInvited.push(createdSessionUserDetail)
                    } else if (participants_1 == null && participants_3 == null) {
                        const createdSessionUserDetail = {
                            _id: findInvited._id,
                            cretedSessionUserId: createdSessionUser._id,
                            cretedSessionUsername: createdSessionUser.firstName,
                            isLive: findInvited.started,
                            isAbleToJoin: findInvited.started,
                            RoomType: findInvited.RoomType,
                            selectedTime: findInvited.selectedTime,
                            selectedDate: `${year}-${months}-${date} ${hour}:${minutes}`,
                            cretedSessionUserphoto: createdSessionUser.photo ? createdSessionUser.photo[0].res : "",
                            participants: []
                        }
                        allInvited.push(createdSessionUserDetail)
                    }

                } else if (findInvited.participants[0].participants_3 == req.params.user_id) {


                    const dateAll = new Date(findInvited.selectedDate)

                    let months = dateAll.getMonth();
                    let date = dateAll.getDate();
                    let year = dateAll.getFullYear();
                    let hour = dateAll.getHours();
                    let minutes = dateAll.getMinutes();

                    const createdSessionUser = await userModel.findOne({
                        _id: findInvited.cretedSessionUser,
                        polyDating: 0
                    })
                    const participants_1 = await userModel.findOne({
                        _id: findInvited.participants[0].participants_1,
                        polyDating: 0
                    })
                    const participants_2 = await userModel.findOne({
                        _id: findInvited.participants[0].participants_2,
                        polyDating: 0
                    })

                    if (participants_1 == null && participants_2) {
                        const createdSessionUserDetail = {
                            _id: findInvited._id,
                            cretedSessionUserId: createdSessionUser._id,
                            cretedSessionUsername: createdSessionUser.firstName,
                            isLive: findInvited.started,
                            isAbleToJoin: findInvited.started,
                            RoomType: findInvited.RoomType,
                            selectedTime: findInvited.selectedTime,
                            selectedDate: `${year}-${months + 1}-${date} ${hour}:${minutes}`,
                            cretedSessionUserphoto: createdSessionUser.photo ? createdSessionUser.photo[0].res : "",
                            participants: [{
                                _id: participants_2 == null ? "" : participants_2._id,
                                photo: participants_2.photo ? participants_2.photo[0].res : "",
                                name: participants_2 == null ? "" : participants_2.firstName
                            }]
                        }
                        allInvited.push(createdSessionUserDetail)
                    } else if (participants_2 == null && participants_1) {
                        const createdSessionUserDetail = {
                            _id: findInvited._id,
                            cretedSessionUserId: createdSessionUser._id,
                            cretedSessionUsername: createdSessionUser.firstName,
                            isLive: findInvited.started,
                            isAbleToJoin: findInvited.started,
                            RoomType: findInvited.RoomType,
                            selectedTime: findInvited.selectedTime,
                            selectedDate: `${year}-${months}-${date} ${hour}:${minutes}`,
                            cretedSessionUserphoto: createdSessionUser.photo ? createdSessionUser.photo[0].res : "",
                            participants: [{
                                _id: participants_1 == null ? "" : participants_1._id,
                                photo: participants_1.photo ? participants_1.photo[0].res : "",
                                name: participants_1 == null ? "" : participants_1.firstName
                            }]
                        }
                        allInvited.push(createdSessionUserDetail)

                    } else if (participants_1 && participants_2) {
                        const createdSessionUserDetail = {
                            _id: findInvited._id,
                            cretedSessionUserId: createdSessionUser._id,
                            cretedSessionUsername: createdSessionUser.firstName,
                            isLive: findInvited.started,
                            isAbleToJoin: findInvited.started,
                            RoomType: findInvited.RoomType,
                            selectedTime: findInvited.selectedTime,
                            selectedDate: `${year}-${months}-${date} ${hour}:${minutes}`,
                            cretedSessionUserphoto: createdSessionUser.photo ? createdSessionUser.photo[0].res : "",
                            participants: [{
                                _id: participants_1 == null ? "" : participants_1._id,
                                photo: participants_1.photo ? participants_1.photo[0].res : "",
                                name: participants_1 == null ? "" : participants_1.firstName
                            }, {
                                _id: participants_2 == null ? "" : participants_2._id,
                                photo: participants_2.photo ? participants_2.photo[0].res : "",
                                name: participants_2 == null ? "" : participants_2.firstName
                            }]
                        }
                        allInvited.push(createdSessionUserDetail)

                    } else if (participants_1 == null && participants_2 == null) {
                        const createdSessionUserDetail = {
                            _id: findInvited._id,
                            cretedSessionUserId: createdSessionUser._id,
                            cretedSessionUsername: createdSessionUser.firstName,
                            isLive: findInvited.started,
                            isAbleToJoin: findInvited.started,
                            RoomType: findInvited.RoomType,
                            selectedTime: findInvited.selectedTime,
                            selectedDate: `${year}-${months}-${date} ${hour}:${minutes}`,
                            cretedSessionUserphoto: createdSessionUser.photo ? createdSessionUser.photo[0].res : "",
                            participants: []
                        }
                        allInvited.push(createdSessionUserDetail)
                    }
                }
            } else {
                if (findInvited.participants[0].participants_1 == req.params.user_id) {


                    const dateAll = new Date(findInvited.selectedDate)

                    let months = dateAll.getMonth();
                    let date = dateAll.getDate();
                    let year = dateAll.getFullYear();
                    let hour = dateAll.getHours();
                    let minutes = dateAll.getMinutes();
                    const createdSessionUser = await userModel.findOne({
                        _id: findInvited.cretedSessionUser,
                        polyDating: 0
                    })

                    const participants_2 = await userModel.findOne({
                        _id: findInvited.participants[0].participants_2,
                        polyDating: 0
                    })
                    const participants_3 = await userModel.findOne({
                        _id: findInvited.participants[0].participants_3,
                        polyDating: 0
                    })

                    if (participants_2 == null && participants_3) {
                        const createdSessionUserDetail = {
                            _id: findInvited._id,
                            cretedSessionUserId: createdSessionUser._id,
                            cretedSessionUsername: createdSessionUser.firstName,
                            isLive: findInvited.started,
                            isAbleToJoin: findInvited.started,
                            RoomType: findInvited.RoomType,
                            selectedTime: findInvited.selectedTime,
                            selectedDate: `${year}-${months + 1}-${date} ${hour}:${minutes}`,
                            cretedSessionUserphoto: createdSessionUser.photo ? createdSessionUser.photo[0].res : "",
                            participants: [{
                                _id: participants_3 == null ? "" : participants_3._id,
                                photo: participants_3.photo ? participants_3.photo[0].res : "",
                                name: participants_3 == null ? "" : participants_3.firstName
                            }]
                        }
                        allInvited1.push(createdSessionUserDetail)
                    } else if (participants_3 == null && participants_2) {
                        const createdSessionUserDetail = {
                            _id: findInvited._id,
                            cretedSessionUserId: createdSessionUser._id,
                            cretedSessionUsername: createdSessionUser.firstName,
                            isLive: findInvited.started,
                            isAbleToJoin: findInvited.started,
                            RoomType: findInvited.RoomType,
                            selectedTime: findInvited.selectedTime,
                            selectedDate: `${year}-${months}-${date} ${hour}:${minutes}`,
                            cretedSessionUserphoto: createdSessionUser.photo ? createdSessionUser.photo[0].res : "",
                            participants: [{
                                _id: participants_2 == null ? "" : participants_2._id,
                                photo: participants_2.photo ? participants_2.photo[0].res : "",
                                name: participants_2 == null ? "" : participants_2.firstName
                            }]
                        }
                        allInvited1.push(createdSessionUserDetail)
                    } else if (participants_2 && participants_3) {
                        const createdSessionUserDetail = {
                            _id: findInvited._id,
                            cretedSessionUserId: createdSessionUser._id,
                            cretedSessionUsername: createdSessionUser.firstName,
                            isLive: findInvited.started,
                            isAbleToJoin: findInvited.started,
                            RoomType: findInvited.RoomType,
                            selectedTime: findInvited.selectedTime,
                            selectedDate: `${year}-${months}-${date} ${hour}:${minutes}`,
                            cretedSessionUserphoto: createdSessionUser.photo ? createdSessionUser.photo[0].res : "",
                            participants: [{
                                _id: participants_2 == null ? "" : participants_2._id,
                                photo: participants_2.photo ? participants_2.photo[0].res : "",
                                name: participants_2 == null ? "" : participants_2.firstName
                            },
                            {
                                _id: participants_3 == null ? "" : participants_3._id,
                                photo: participants_3.photo ? participants_3.photo[0].res : "",
                                name: participants_3 == null ? "" : participants_3.firstName
                            }]
                        }
                        allInvited1.push(createdSessionUserDetail)
                    } else if (participants_2 == null && participants_3 == null) {
                        const createdSessionUserDetail = {
                            _id: findInvited._id,
                            cretedSessionUserId: createdSessionUser._id,
                            cretedSessionUsername: createdSessionUser.firstName,
                            isLive: findInvited.started,
                            isAbleToJoin: findInvited.started,
                            RoomType: findInvited.RoomType,
                            selectedTime: findInvited.selectedTime,
                            selectedDate: `${year}-${months}-${date} ${hour}:${minutes}`,
                            cretedSessionUserphoto: createdSessionUser.photo ? createdSessionUser.photo[0].res : "",
                            participants: []
                        }
                        allInvited1.push(createdSessionUserDetail)
                    }

                } else if (findInvited.participants[0].participants_2 == req.params.user_id) {

                    const dateAll = new Date(findInvited.selectedDate)

                    let months = dateAll.getMonth();
                    let date = dateAll.getDate();
                    let year = dateAll.getFullYear();
                    let hour = dateAll.getHours();
                    let minutes = dateAll.getMinutes();

                    const createdSessionUser = await userModel.findOne({
                        _id: findInvited.cretedSessionUser,
                        polyDating: 0
                    })
                    const participants_1 = await userModel.findOne({
                        _id: findInvited.participants[0].participants_1,
                        polyDating: 0
                    })
                    const participants_3 = await userModel.findOne({
                        _id: findInvited.participants[0].participants_3,
                        polyDating: 0
                    })

                    if (participants_1 == null && participants_3) {
                        const createdSessionUserDetail = {
                            _id: findInvited._id,
                            cretedSessionUserId: createdSessionUser._id,
                            cretedSessionUsername: createdSessionUser.firstName,
                            isLive: findInvited.started,
                            isAbleToJoin: findInvited.started,
                            RoomType: findInvited.RoomType,
                            selectedTime: findInvited.selectedTime,
                            selectedDate: `${year}-${months + 1}-${date} ${hour}:${minutes}`,
                            cretedSessionUserphoto: createdSessionUser.photo ? createdSessionUser.photo[0].res : "",
                            participants: [{
                                _id: participants_3 == null ? "" : participants_3._id,
                                photo: participants_3.photo ? participants_3.photo[0].res : "",
                                name: participants_3 == null ? "" : participants_3.firstName
                            }]
                        }
                        allInvited1.push(createdSessionUserDetail)
                    } else if (participants_3 == null && participants_1) {
                        const createdSessionUserDetail = {
                            _id: findInvited._id,
                            cretedSessionUserId: createdSessionUser._id,
                            cretedSessionUsername: createdSessionUser.firstName,
                            isLive: findInvited.started,
                            isAbleToJoin: findInvited.started,
                            RoomType: findInvited.RoomType,
                            selectedTime: findInvited.selectedTime,
                            selectedDate: `${year}-${months}-${date} ${hour}:${minutes}`,
                            cretedSessionUserphoto: createdSessionUser.photo ? createdSessionUser.photo[0].res : "",
                            participants: [{
                                _id: participants_1 == null ? "" : participants_1._id,
                                photo: participants_1.photo ? participants_1.photo[0].res : "",
                                name: participants_1 == null ? "" : participants_1.firstName
                            }]
                        }
                        allInvited1.push(createdSessionUserDetail)

                    } else if (participants_1 && participants_3) {
                        const createdSessionUserDetail = {
                            _id: findInvited._id,
                            cretedSessionUserId: createdSessionUser._id,
                            cretedSessionUsername: createdSessionUser.firstName,
                            isLive: findInvited.started,
                            isAbleToJoin: findInvited.started,
                            RoomType: findInvited.RoomType,
                            selectedTime: findInvited.selectedTime,
                            selectedDate: `${year}-${months}-${date} ${hour}:${minutes}`,
                            cretedSessionUserphoto: createdSessionUser.photo ? createdSessionUser.photo[0].res : "",
                            participants: [{
                                _id: participants_1 == null ? "" : participants_1._id,
                                photo: participants_1.photo ? participants_1.photo[0].res : "",
                                name: participants_1 == null ? "" : participants_1.firstName
                            }, {
                                _id: participants_3 == null ? "" : participants_3._id,
                                photo: participants_3.photo ? participants_3.photo[0].res : "",
                                name: participants_3 == null ? "" : participants_3.firstName
                            }]
                        }
                        allInvited1.push(createdSessionUserDetail)
                    } else if (participants_1 == null && participants_3 == null) {
                        const createdSessionUserDetail = {
                            _id: findInvited._id,
                            cretedSessionUserId: createdSessionUser._id,
                            cretedSessionUsername: createdSessionUser.firstName,
                            isLive: findInvited.started,
                            isAbleToJoin: findInvited.started,
                            RoomType: findInvited.RoomType,
                            selectedTime: findInvited.selectedTime,
                            selectedDate: `${year}-${months}-${date} ${hour}:${minutes}`,
                            cretedSessionUserphoto: createdSessionUser.photo ? createdSessionUser.photo[0].res : "",
                            participants: []
                        }
                        allInvited1.push(createdSessionUserDetail)
                    }

                } else if (findInvited.participants[0].participants_3 == req.params.user_id) {


                    const dateAll = new Date(findInvited.selectedDate)

                    let months = dateAll.getMonth();
                    let date = dateAll.getDate();
                    let year = dateAll.getFullYear();
                    let hour = dateAll.getHours();
                    let minutes = dateAll.getMinutes();

                    const createdSessionUser = await userModel.findOne({
                        _id: findInvited.cretedSessionUser,
                        polyDating: 0
                    })
                    const participants_1 = await userModel.findOne({
                        _id: findInvited.participants[0].participants_1,
                        polyDating: 0
                    })
                    const participants_2 = await userModel.findOne({
                        _id: findInvited.participants[0].participants_2,
                        polyDating: 0
                    })

                    if (participants_1 == null && participants_2) {
                        const createdSessionUserDetail = {
                            _id: findInvited._id,
                            cretedSessionUserId: createdSessionUser._id,
                            cretedSessionUsername: createdSessionUser.firstName,
                            isLive: findInvited.started,
                            isAbleToJoin: findInvited.started,
                            RoomType: findInvited.RoomType,
                            selectedTime: findInvited.selectedTime,
                            selectedDate: `${year}-${months + 1}-${date} ${hour}:${minutes}`,
                            cretedSessionUserphoto: createdSessionUser.photo ? createdSessionUser.photo[0].res : "",
                            participants: [{
                                _id: participants_2 == null ? "" : participants_2._id,
                                photo: participants_2.photo ? participants_2.photo[0].res : "",
                                name: participants_2 == null ? "" : participants_2.firstName
                            }]
                        }
                        allInvited1.push(createdSessionUserDetail)
                    } else if (participants_2 == null && participants_1) {
                        const createdSessionUserDetail = {
                            _id: findInvited._id,
                            cretedSessionUserId: createdSessionUser._id,
                            cretedSessionUsername: createdSessionUser.firstName,
                            isLive: findInvited.started,
                            isAbleToJoin: findInvited.started,
                            RoomType: findInvited.RoomType,
                            selectedTime: findInvited.selectedTime,
                            selectedDate: `${year}-${months}-${date} ${hour}:${minutes}`,
                            cretedSessionUserphoto: createdSessionUser.photo ? createdSessionUser.photo[0].res : "",
                            participants: [{
                                _id: participants_1 == null ? "" : participants_1._id,
                                photo: participants_1.photo ? participants_1.photo[0].res : "",
                                name: participants_1 == null ? "" : participants_1.firstName
                            }]
                        }
                        allInvited1.push(createdSessionUserDetail)

                    } else if (participants_1 && participants_2) {
                        const createdSessionUserDetail = {
                            _id: findInvited._id,
                            cretedSessionUserId: createdSessionUser._id,
                            cretedSessionUsername: createdSessionUser.firstName,
                            isLive: findInvited.started,
                            isAbleToJoin: findInvited.started,
                            RoomType: findInvited.RoomType,
                            selectedTime: findInvited.selectedTime,
                            selectedDate: `${year}-${months}-${date} ${hour}:${minutes}`,
                            cretedSessionUserphoto: createdSessionUser.photo ? createdSessionUser.photo[0].res : "",
                            participants: [{
                                _id: participants_1 == null ? "" : participants_1._id,
                                photo: participants_1.photo ? participants_1.photo[0].res : "",
                                name: participants_1 == null ? "" : participants_1.firstName
                            }, {
                                _id: participants_2 == null ? "" : participants_2._id,
                                photo: participants_2.photo ? participants_2.photo[0].res : "",
                                name: participants_2 == null ? "" : participants_2.firstName
                            }]
                        }
                        allInvited1.push(createdSessionUserDetail)

                    } else if (participants_1 == null && participants_2 == null) {
                        const createdSessionUserDetail = {
                            _id: findInvited._id,
                            cretedSessionUserId: createdSessionUser._id,
                            cretedSessionUsername: createdSessionUser.firstName,
                            isLive: findInvited.started,
                            isAbleToJoin: findInvited.started,
                            RoomType: findInvited.RoomType,
                            selectedTime: findInvited.selectedTime,
                            selectedDate: `${year}-${months}-${date} ${hour}:${minutes}`,
                            cretedSessionUserphoto: createdSessionUser.photo ? createdSessionUser.photo[0].res : "",
                            participants: []
                        }
                        allInvited1.push(createdSessionUserDetail)
                    }
                }
            }

        }


        const res1 = allInvited.sort((a, b) => new Date(a.selectedDate) - new Date(b.selectedDate))
        const response = [...res1, ...allInvited1]

        const page = parseInt(req.query.page)
        const limit = parseInt(req.query.limit)
        const startIndex = (page - 1) * limit;
        const endIndex = page * limit;
        const data = allInvited.length;
        const pageCount = Math.ceil(data / limit);

        if (response[0] == undefined) {
            res.status(status.OK).json({
                "message": "Not have any Invited!",
                "status": true,
                "code": 200,
                "statusCode": 1,
                "pageCount": 0,
                "data": []

            })
        } else {
            res.status(status.OK).json({
                "message": "successfully Show All Invited Session!",
                "status": true,
                "code": 200,
                "statusCode": 1,
                "pageCount": (pageCount).toString() == (NaN).toString() ? 0 : pageCount,
                "data": (startIndex).toString() == (NaN).toString() ? response : response.slice(startIndex, endIndex)

            })
        }


    } catch (error) {
        console.log("error", error);
        res.status(status.INTERNAL_SERVER_ERROR).json(
            new APIResponse("Something Went Wrong", "false", 500, "0", error.message)
        )
    }
}

exports.mySession = async (req, res, next) => {
    try {

        const mySession = [];
        const mySession1 = [];
        const findUserInsession = await sessionModel.find({
            cretedSessionUser: req.params.user_id
        })



        for (const findMySession of findUserInsession) {
            var userSessionDate = new Date(new Date(findMySession.selectedDate).toUTCString())
            let userSessionDates = userSessionDate.getUTCDate();
            let userSessionmonth = userSessionDate.getUTCMonth();
            let userSessionyear = userSessionDate.getUTCFullYear();
            let userSessionhour = userSessionDate.getUTCHours();
            let userSessionminute = userSessionDate.getUTCMinutes();

            const finalMinute = userSessionminute >= 30 ? userSessionminute - 30 : userSessionminute + 30;
            const finalHours = userSessionminute >= 30 ? userSessionhour - 5 : userSessionhour - 6;
            let userSessionsecond = userSessionDate.getUTCSeconds();
            const finalUserSessionDate = new Date(`${userSessionyear}-${userSessionmonth + 1}-${userSessionDates} ${finalHours}:${finalMinute}:${userSessionsecond}`)

            const date = new Date(new Date().toUTCString())
            let dates = date.getUTCDate();
            let month = date.getUTCMonth()
            let year = date.getUTCFullYear();
            let hour = date.getUTCHours();
            let minute = date.getUTCMinutes();
            let second = date.getUTCSeconds();
            now = new Date(`${year}-${month + 1}-${dates} ${hour}:${minute}:${second}`)


            var sec_num = (finalUserSessionDate - now) / 1000;
            var days = Math.floor(sec_num / (3600 * 24));
            var hours = Math.floor((sec_num - (days * (3600 * 24))) / 3600);
            var minutes = Math.floor((sec_num - (days * (3600 * 24)) - (hours * 3600)) / 60) + 1;

            var getDate = new Date(findMySession.selectedDate)
            const hoursOne = getDate.getHours()
            const minutesOne = getDate.getMinutes()


            const findUserDeatil = await userModel.findOne({
                _id: findMySession.cretedSessionUser,
                polyDating: 0
            })

            const findParticipantsiUserDeatil1 = await userModel.findOne({
                _id: findMySession.participants[0].participants_1,
                polyDating: 0
            })

            const findParticipantsiUserDeatil2 = await userModel.findOne({
                _id: findMySession.participants[0].participants_2,
                polyDating: 0
            })
            const findParticipantsiUserDeatil3 = await userModel.findOne({
                _id: findMySession.participants[0].participants_3,
                polyDating: 0
            })


            if (findMySession.sessionEndOrNot == false) {

                if (findUserDeatil && findParticipantsiUserDeatil1 && findParticipantsiUserDeatil2 && findParticipantsiUserDeatil3) {

                    const response = {
                        _id: findMySession._id,
                        selectedTime: findMySession.selectedTime,
                        selectedDate: `${year}-${month + 1}-${dates} ${hoursOne}:${minutesOne}`,
                        isLive: ((days < 0 && hours >= 0 && minutes >= 0) || (days == 0 && hours == 0 && minutes == 0)) == true ? true : false,
                        RoomType: findMySession.RoomType,
                        cretedSessionUserId: findUserDeatil ? findUserDeatil._id : "",
                        cretedSessionUserphoto: findUserDeatil.photo ? findUserDeatil.photo[0] ? findUserDeatil.photo[0].res : "" : "",
                        cretedSessionUsername: findUserDeatil ? findUserDeatil.firstName : "",
                        isStart: ((days < 0 && hours >= 0 && minutes >= 0) || (days == 0 && hours == 0 && minutes == 0)) == true ? true : false,
                        participants: [
                            {
                                _id: findParticipantsiUserDeatil1 ? findParticipantsiUserDeatil1._id : "",
                                photo: findParticipantsiUserDeatil1 == null ? "" : findParticipantsiUserDeatil1.photo[0] ? findParticipantsiUserDeatil1.photo[0].res : "",
                                name: findParticipantsiUserDeatil1 == null ? "" : findParticipantsiUserDeatil1.firstName
                            },
                            {
                                _id: findParticipantsiUserDeatil2 ? findParticipantsiUserDeatil2._id : "",
                                photo: findParticipantsiUserDeatil2 == null ? "" : findParticipantsiUserDeatil2.photo[0] ? findParticipantsiUserDeatil2.photo[0].res : "",
                                name: findParticipantsiUserDeatil2 == null ? " " : findParticipantsiUserDeatil2.firstName
                            },
                            {
                                _id: findParticipantsiUserDeatil3 ? findParticipantsiUserDeatil3._id : "",
                                photo: findParticipantsiUserDeatil3 == null ? " " : findParticipantsiUserDeatil3.photo[0] ? findParticipantsiUserDeatil3.photo[0].res : "",
                                name: findParticipantsiUserDeatil3 == null ? "" : findParticipantsiUserDeatil3.firstName
                            }
                        ]
                    }

                    mySession.push(response)
                } else if (findUserDeatil && findParticipantsiUserDeatil1 == null && findParticipantsiUserDeatil2 == null && findParticipantsiUserDeatil3 == null) {

                    const response = {
                        _id: findMySession._id,
                        selectedTime: findMySession.selectedTime,
                        selectedDate: `${year}-${month + 1}-${dates} ${hoursOne}:${minutesOne}`,
                        isLive: ((days < 0 && hours >= 0 && minutes >= 0) || (days == 0 && hours == 0 && minutes == 0)) == true ? true : false,
                        RoomType: findMySession.RoomType,
                        cretedSessionUserId: findUserDeatil ? findUserDeatil._id : "",
                        cretedSessionUserphoto: findUserDeatil.photo ? findUserDeatil.photo[0] ? findUserDeatil.photo[0].res : "" : "",
                        cretedSessionUsername: findUserDeatil ? findUserDeatil.firstName : "",
                        isStart: ((days < 0 && hours >= 0 && minutes >= 0) || (days == 0 && hours == 0 && minutes == 0)) == true ? true : false,
                        participants: []

                    }

                    mySession.push(response)
                } else if (findUserDeatil && findParticipantsiUserDeatil1 == null && findParticipantsiUserDeatil2 && findParticipantsiUserDeatil3) {
                    const response = {
                        _id: findMySession._id,
                        selectedTime: findMySession.selectedTime,
                        selectedDate: `${year}-${month + 1}-${dates} ${hoursOne}:${minutesOne}`,
                        isLive: ((days < 0 && hours >= 0 && minutes >= 0) || (days == 0 && hours == 0 && minutes == 0)) == true ? true : false,
                        RoomType: findMySession.RoomType,
                        cretedSessionUserId: findUserDeatil ? findUserDeatil._id : "",
                        cretedSessionUserphoto: findUserDeatil.photo ? findUserDeatil.photo[0] ? findUserDeatil.photo[0].res : "" : "",
                        cretedSessionUsername: findUserDeatil ? findUserDeatil.firstName : "",
                        isStart: ((days < 0 && hours >= 0 && minutes >= 0) || (days == 0 && hours == 0 && minutes == 0)) == true ? true : false,
                        participants: [
                            {
                                _id: findParticipantsiUserDeatil2 ? findParticipantsiUserDeatil2._id : "",
                                photo: findParticipantsiUserDeatil2 == null ? "" : findParticipantsiUserDeatil2.photo[0] ? findParticipantsiUserDeatil2.photo[0].res : "",
                                name: findParticipantsiUserDeatil2 == null ? "" : findParticipantsiUserDeatil2.firstName
                            },
                            {
                                _id: findParticipantsiUserDeatil3 ? findParticipantsiUserDeatil3._id : "",
                                photo: findParticipantsiUserDeatil3 == null ? " " : findParticipantsiUserDeatil3.photo[0] ? findParticipantsiUserDeatil3.photo[0].res : "",
                                name: findParticipantsiUserDeatil3 == null ? "" : findParticipantsiUserDeatil3.firstName
                            }
                        ]

                    }

                    mySession.push(response)
                } else if (findUserDeatil && findParticipantsiUserDeatil1 && findParticipantsiUserDeatil2 == null && findParticipantsiUserDeatil3) {
                    const response = {
                        _id: findMySession._id,
                        selectedTime: findMySession.selectedTime,
                        selectedDate: `${year}-${month + 1}-${dates} ${hoursOne}:${minutesOne}`,
                        isLive: ((days < 0 && hours >= 0 && minutes >= 0) || (days == 0 && hours == 0 && minutes == 0)) == true ? true : false,
                        RoomType: findMySession.RoomType,
                        cretedSessionUserId: findUserDeatil ? findUserDeatil._id : "",
                        cretedSessionUserphoto: findUserDeatil.photo ? findUserDeatil.photo[0] ? findUserDeatil.photo[0].res : "" : "",
                        cretedSessionUsername: findUserDeatil ? findUserDeatil.firstName : "",
                        isStart: ((days < 0 && hours >= 0 && minutes >= 0) || (days == 0 && hours == 0 && minutes == 0)) == true ? true : false,
                        participants: [
                            {
                                _id: findParticipantsiUserDeatil1 ? findParticipantsiUserDeatil1._id : "",
                                photo: findParticipantsiUserDeatil1 == null ? "" : findParticipantsiUserDeatil1.photo[0] ? findParticipantsiUserDeatil1.photo[0].res : "",
                                name: findParticipantsiUserDeatil1 == null ? "" : findParticipantsiUserDeatil1.firstName
                            }, {
                                _id: findParticipantsiUserDeatil3 ? findParticipantsiUserDeatil3._id : "",
                                photo: findParticipantsiUserDeatil3 == null ? " " : findParticipantsiUserDeatil3.photo[0] ? findParticipantsiUserDeatil3.photo[0].res : "",
                                name: findParticipantsiUserDeatil3 == null ? "" : findParticipantsiUserDeatil3.firstName
                            }
                        ]
                    }

                    mySession.push(response)
                } else if (findUserDeatil && findParticipantsiUserDeatil1 && findParticipantsiUserDeatil2 && findParticipantsiUserDeatil3 == null) {
                    const response = {
                        _id: findMySession._id,
                        selectedTime: findMySession.selectedTime,
                        selectedDate: `${year}-${month + 1}-${dates} ${hoursOne}:${minutesOne}`,
                        isLive: ((days < 0 && hours >= 0 && minutes >= 0) || (days == 0 && hours == 0 && minutes == 0)) == true ? true : false,
                        RoomType: findMySession.RoomType,
                        cretedSessionUserId: findUserDeatil ? findUserDeatil._id : "",
                        cretedSessionUserphoto: findUserDeatil.photo ? findUserDeatil.photo[0] ? findUserDeatil.photo[0].res : "" : "",
                        cretedSessionUsername: findUserDeatil ? findUserDeatil.firstName : "",
                        isStart: ((days < 0 && hours >= 0 && minutes >= 0) || (days == 0 && hours == 0 && minutes == 0)) == true ? true : false,
                        participants: [
                            {
                                _id: findParticipantsiUserDeatil1 ? findParticipantsiUserDeatil1._id : "",
                                photo: findParticipantsiUserDeatil1 == null ? "" : findParticipantsiUserDeatil1.photo[0] ? findParticipantsiUserDeatil1.photo[0].res : "",
                                name: findParticipantsiUserDeatil1 == null ? "" : findParticipantsiUserDeatil1.firstName
                            },
                            {
                                _id: findParticipantsiUserDeatil2 ? findParticipantsiUserDeatil2._id : "",
                                photo: findParticipantsiUserDeatil2 == null ? "" : findParticipantsiUserDeatil2.photo[0] ? findParticipantsiUserDeatil2.photo[0].res : "",
                                name: findParticipantsiUserDeatil2 == null ? " " : findParticipantsiUserDeatil2.firstName
                            }
                        ]
                    }

                    mySession.push(response)
                }
            } else if (findMySession.sessionEndOrNot == true) {
                if (findUserDeatil && findParticipantsiUserDeatil1 && findParticipantsiUserDeatil2 && findParticipantsiUserDeatil3) {
                    const response = {
                        _id: findMySession._id,
                        selectedTime: findMySession.selectedTime,
                        selectedDate: `${year}-${month + 1}-${dates} ${hoursOne}:${minutesOne}`,
                        isLive: false,
                        RoomType: findMySession.RoomType,
                        cretedSessionUserId: findUserDeatil ? findUserDeatil._id : "",
                        cretedSessionUserphoto: findUserDeatil.photo ? findUserDeatil.photo[0] ? findUserDeatil.photo[0].res : "" : "",
                        cretedSessionUsername: findUserDeatil ? findUserDeatil.firstName : "",
                        isStart: false,
                        participants: [
                            {
                                _id: findParticipantsiUserDeatil1 ? findParticipantsiUserDeatil1._id : "",
                                photo: findParticipantsiUserDeatil1 == null ? "" : findParticipantsiUserDeatil1.photo[0] ? findParticipantsiUserDeatil1.photo[0].res : "",
                                name: findParticipantsiUserDeatil1 == null ? "" : findParticipantsiUserDeatil1.firstName
                            },
                            {
                                _id: findParticipantsiUserDeatil2 ? findParticipantsiUserDeatil2._id : "",
                                photo: findParticipantsiUserDeatil2 == null ? "" : findParticipantsiUserDeatil2.photo[0] ? findParticipantsiUserDeatil2.photo[0].res : "",
                                name: findParticipantsiUserDeatil2 == null ? " " : findParticipantsiUserDeatil2.firstName
                            },
                            {
                                _id: findParticipantsiUserDeatil3 ? findParticipantsiUserDeatil3._id : "",
                                photo: findParticipantsiUserDeatil3 == null ? " " : findParticipantsiUserDeatil3.photo[0] ? findParticipantsiUserDeatil3.photo[0].res : "",
                                name: findParticipantsiUserDeatil3 == null ? "" : findParticipantsiUserDeatil3.firstName
                            }
                        ]
                    }

                    mySession1.push(response)
                } else if (findUserDeatil && findParticipantsiUserDeatil1 == null && findParticipantsiUserDeatil2 == null && findParticipantsiUserDeatil3 == null) {
                    const response = {
                        _id: findMySession._id,
                        selectedTime: findMySession.selectedTime,
                        selectedDate: `${year}-${month + 1}-${dates} ${hoursOne}:${minutesOne}`,
                        isLive: false,
                        RoomType: findMySession.RoomType,
                        cretedSessionUserId: findUserDeatil ? findUserDeatil._id : "",
                        cretedSessionUserphoto: findUserDeatil.photo ? findUserDeatil.photo[0] ? findUserDeatil.photo[0].res : "" : "",
                        cretedSessionUsername: findUserDeatil ? findUserDeatil.firstName : "",
                        isStart: false,
                        participants: []

                    }

                    mySession1.push(response)
                } else if (findUserDeatil && findParticipantsiUserDeatil1 == null && findParticipantsiUserDeatil2 && findParticipantsiUserDeatil3) {
                    const response = {
                        _id: findMySession._id,
                        selectedTime: findMySession.selectedTime,
                        selectedDate: `${year}-${month + 1}-${dates} ${hoursOne}:${minutesOne}`,
                        isLive: false,
                        RoomType: findMySession.RoomType,
                        cretedSessionUserId: findUserDeatil ? findUserDeatil._id : "",
                        cretedSessionUserphoto: findUserDeatil.photo ? findUserDeatil.photo[0] ? findUserDeatil.photo[0].res : "" : "",
                        cretedSessionUsername: findUserDeatil ? findUserDeatil.firstName : "",
                        isStart: false,
                        participants: [
                            {
                                _id: findParticipantsiUserDeatil2 ? findParticipantsiUserDeatil2._id : "",
                                photo: findParticipantsiUserDeatil2 == null ? "" : findParticipantsiUserDeatil2.photo[0] ? findParticipantsiUserDeatil2.photo[0].res : "",
                                name: findParticipantsiUserDeatil2 == null ? " " : findParticipantsiUserDeatil2.firstName
                            },
                            {
                                _id: findParticipantsiUserDeatil3 ? findParticipantsiUserDeatil3._id : "",
                                photo: findParticipantsiUserDeatil3 == null ? " " : findParticipantsiUserDeatil3.photo[0] ? findParticipantsiUserDeatil3.photo[0].res : "",
                                name: findParticipantsiUserDeatil3 == null ? "" : findParticipantsiUserDeatil3.firstName
                            }
                        ]

                    }

                    mySession1.push(response)
                } else if (findUserDeatil && findParticipantsiUserDeatil1 && findParticipantsiUserDeatil2 == null && findParticipantsiUserDeatil3) {
                    const response = {
                        _id: findMySession._id,
                        selectedTime: findMySession.selectedTime,
                        selectedDate: `${year}-${month + 1}-${dates} ${hoursOne}:${minutesOne}`,
                        isLive: false,
                        RoomType: findMySession.RoomType,
                        cretedSessionUserId: findUserDeatil ? findUserDeatil._id : "",
                        cretedSessionUserphoto: findUserDeatil.photo ? findUserDeatil.photo[0] ? findUserDeatil.photo[0].res : "" : "",
                        cretedSessionUsername: findUserDeatil ? findUserDeatil.firstName : "",
                        isStart: false,
                        participants: [
                            {
                                _id: findParticipantsiUserDeatil1 ? findParticipantsiUserDeatil1._id : "",
                                photo: findParticipantsiUserDeatil1 == null ? "" : findParticipantsiUserDeatil1.photo[0] ? findParticipantsiUserDeatil1.photo[0].res : "",
                                name: findParticipantsiUserDeatil1 == null ? "" : findParticipantsiUserDeatil1.firstName
                            }, {
                                _id: findParticipantsiUserDeatil3 ? findParticipantsiUserDeatil3._id : "",
                                photo: findParticipantsiUserDeatil3 == null ? " " : findParticipantsiUserDeatil3.photo[0] ? findParticipantsiUserDeatil3.photo[0].res : "",
                                name: findParticipantsiUserDeatil3 == null ? "" : findParticipantsiUserDeatil3.firstName
                            }
                        ]
                    }

                    mySession1.push(response)
                } else if (findUserDeatil && findParticipantsiUserDeatil1 && findParticipantsiUserDeatil2 && findParticipantsiUserDeatil3 == null) {
                    const response = {
                        _id: findMySession._id,
                        selectedTime: findMySession.selectedTime,
                        selectedDate: `${year}-${month + 1}-${dates} ${hoursOne}:${minutesOne}`,
                        isLive: false,
                        RoomType: findMySession.RoomType,
                        cretedSessionUserId: findUserDeatil ? findUserDeatil._id : "",
                        cretedSessionUserphoto: findUserDeatil.photo ? findUserDeatil.photo[0] ? findUserDeatil.photo[0].res : "" : "",
                        cretedSessionUsername: findUserDeatil ? findUserDeatil.firstName : "",
                        isStart: false,
                        participants: [
                            {
                                _id: findParticipantsiUserDeatil1 ? findParticipantsiUserDeatil1._id : "",
                                photo: findParticipantsiUserDeatil1 == null ? "" : findParticipantsiUserDeatil1.photo[0] ? findParticipantsiUserDeatil1.photo[0].res : "",
                                name: findParticipantsiUserDeatil1 == null ? "" : findParticipantsiUserDeatil1.firstName
                            },
                            {
                                _id: findParticipantsiUserDeatil2 ? findParticipantsiUserDeatil2._id : "",
                                photo: findParticipantsiUserDeatil2 == null ? "" : findParticipantsiUserDeatil2.photo[0] ? findParticipantsiUserDeatil2.photo[0].res : "",
                                name: findParticipantsiUserDeatil2 == null ? " " : findParticipantsiUserDeatil2.firstName
                            }
                        ]
                    }

                    mySession1.push(response)
                }
            }
        }
        const page = parseInt(req.query.page)
        const limit = parseInt(req.query.limit)
        const startIndex = (page - 1) * limit;
        const endIndex = page * limit;
        const data = mySession.length;
        const pageCount = Math.ceil(data / limit);


        const res1 = mySession.sort((a, b) => new Date(a.selectedDate) - new Date(b.selectedDate))
        const response = [...res1, ...mySession1]

        if (response[0] == undefined) {
            res.status(status.OK).json({
                "message": "I don't create Any Session!",
                "status": true,
                "code": 200,
                "statusCode": 1,
                "pageCount": 0,
                "data": []

            })
        } else {
            res.status(status.OK).json({
                "message": "successfully Show All My Session!",
                "status": true,
                "code": 200,
                "statusCode": 1,
                "pageCount": (pageCount).toString() == (NaN).toString() ? 0 : pageCount,
                "data": (mySession).toString() == (NaN).toString() ? response : response.slice(startIndex, endIndex)

            })
        }
    } catch (error) {
        console.log("error", error);
        res.status(status.INTERNAL_SERVER_ERROR).json(
            new APIResponse("Something Went Wrong", "false", 500, "0", error.message)
        )
    }
}


exports.endSession = async (req, res, next) => {
    try {
        const findSession = await sessionModel.findOne({
            _id: req.params.session_id
        })

        if (findSession) {

            await sessionModel.updateOne({
                _id: req.params.session_id
            }, {
                $set: {
                    sessionEndOrNot: true
                }
            })

            res.status(status.OK).json(
                new APIResponse("end session success", "true", 200, "1")
            )

        } else {
            res.status(status.NOT_FOUND).json(
                new APIResponse("session not found", "true", 404, "1")
            )
        }
    } catch (error) {
        console.log("error", error);
        res.status(status.INTERNAL_SERVER_ERROR).json(
            new APIResponse("Something Went Wrong", "false", 500, "0", error.message)
        )
    }

}

exports.raisHandList = async (req, res, next) => {
    try {

        const findInSession = await sessionModel.findOne({
            _id: req.params.session_id
        })

        if (findInSession) {

            const findInSession = await sessionComment.findOne({
                sessionId: req.params.session_id
            })

            if (findInSession) {

                const finalData = [];
                for (const data of findInSession.raisHand) {
                    const findUser = await userModel.findOne({
                        _id: data.userId
                    })

                    const response = {
                        userId: findUser._id,
                        firstName: findUser.firstName,
                        profile: findUser.photo[0] ? findUser.photo[0].res : "",
                        mute: data.mute
                    }
                    finalData.push(response)
                }

                res.status(status.OK).json(
                    new APIResponse("all rais hand user", "true", 200, "1", finalData)
                )

            } else {

                res.status(status.NOT_FOUND).json(
                    new APIResponse("session not found", "true", 404, "1")
                )
            }

        } else {

            res.status(status.NOT_FOUND).json(
                new APIResponse("session not found", "true", 404, "1")
            )
        }

    } catch (error) {
        console.log("error", error);
        res.status(status.INTERNAL_SERVER_ERROR).json(
            new APIResponse("Something Went Wrong", "false", 500, "0", error.message)
        )
    }
}


exports.sessionDetail = async (req, res, next) => {
    try {

        const mySession = [];
        const findUserInsession = await sessionModel.findOne({
            _id: req.params.session_id
        })

        var userSessionDate = new Date(new Date(findUserInsession.selectedDate).toUTCString())
        let userSessionDates = userSessionDate.getUTCDate();
        let userSessionmonth = userSessionDate.getUTCMonth();
        let userSessionyear = userSessionDate.getUTCFullYear();
        let userSessionhour = userSessionDate.getUTCHours();
        let userSessionminute = userSessionDate.getUTCMinutes();

        const finalMinute = userSessionminute >= 30 ? userSessionminute - 30 : userSessionminute + 30;
        const finalHours = userSessionminute >= 30 ? userSessionhour - 5 : userSessionhour - 6;
        let userSessionsecond = userSessionDate.getUTCSeconds();
        const finalUserSessionDate = new Date(`${userSessionyear}-${userSessionmonth + 1}-${userSessionDates} ${finalHours}:${finalMinute}:${userSessionsecond}`)

        const date = new Date(new Date().toUTCString())
        let dates = date.getUTCDate();
        let month = date.getUTCMonth()
        let year = date.getUTCFullYear();
        let hour = date.getUTCHours();
        let minute = date.getUTCMinutes();
        let second = date.getUTCSeconds();
        now = new Date(`${year}-${month + 1}-${dates} ${hour}:${minute}:${second}`)

        var sec_num = (finalUserSessionDate - now) / 1000;
        var days = Math.floor(sec_num / (3600 * 24));
        var hours = Math.floor((sec_num - (days * (3600 * 24))) / 3600);
        var minutes = Math.floor((sec_num - (days * (3600 * 24)) - (hours * 3600)) / 60) + 1;

        var getDate = new Date(findUserInsession.selectedDate)
        const hoursOne = getDate.getHours()
        const minutesOne = getDate.getMinutes()


        const findUserDeatil = await userModel.findOne({
            _id: findUserInsession.cretedSessionUser,
            polyDating: 0
        })

        const findParticipantsiUserDeatil1 = await userModel.findOne({
            _id: findUserInsession.participants[0].participants_1,
            polyDating: 0
        })

        const findParticipantsiUserDeatil2 = await userModel.findOne({
            _id: findUserInsession.participants[0].participants_2,
            polyDating: 0
        })
        const findParticipantsiUserDeatil3 = await userModel.findOne({
            _id: findUserInsession.participants[0].participants_3,
            polyDating: 0
        })


        if (findUserInsession.sessionEndOrNot == false) {

            if (findUserDeatil && findParticipantsiUserDeatil1 && findParticipantsiUserDeatil2 && findParticipantsiUserDeatil3) {

                const response = {
                    _id: findUserInsession._id,
                    selectedTime: findUserInsession.selectedTime,
                    selectedDate: `${year}-${month + 1}-${dates} ${hoursOne}:${minutesOne}`,
                    isLive: ((days < 0 && hours >= 0 && minutes >= 0) || (days == 0 && hours == 0 && minutes == 0)) == true ? true : false,
                    RoomType: findUserInsession.RoomType,
                    cretedSessionUserId: findUserDeatil ? findUserDeatil._id : "",
                    cretedSessionUserphoto: findUserDeatil.photo ? findUserDeatil.photo[0] ? findUserDeatil.photo[0].res : "" : "",
                    cretedSessionUsername: findUserDeatil ? findUserDeatil.firstName : "",
                    isStart: ((days < 0 && hours >= 0 && minutes >= 0) || (days == 0 && hours == 0 && minutes == 0)) == true ? true : false,
                    participants: [
                        {
                            _id: findParticipantsiUserDeatil1 ? findParticipantsiUserDeatil1._id : "",
                            photo: findParticipantsiUserDeatil1 == null ? "" : findParticipantsiUserDeatil1.photo[0] ? findParticipantsiUserDeatil1.photo[0].res : "",
                            name: findParticipantsiUserDeatil1 == null ? "" : findParticipantsiUserDeatil1.firstName
                        },
                        {
                            _id: findParticipantsiUserDeatil2 ? findParticipantsiUserDeatil2._id : "",
                            photo: findParticipantsiUserDeatil2 == null ? "" : findParticipantsiUserDeatil2.photo[0] ? findParticipantsiUserDeatil2.photo[0].res : "",
                            name: findParticipantsiUserDeatil2 == null ? " " : findParticipantsiUserDeatil2.firstName
                        },
                        {
                            _id: findParticipantsiUserDeatil3 ? findParticipantsiUserDeatil3._id : "",
                            photo: findParticipantsiUserDeatil3 == null ? " " : findParticipantsiUserDeatil3.photo[0] ? findParticipantsiUserDeatil3.photo[0].res : "",
                            name: findParticipantsiUserDeatil3 == null ? "" : findParticipantsiUserDeatil3.firstName
                        }
                    ]
                }

                mySession.push(response)
            } else if (findUserDeatil && findParticipantsiUserDeatil1 == null && findParticipantsiUserDeatil2 == null && findParticipantsiUserDeatil3 == null) {

                const response = {
                    _id: findUserInsession._id,
                    selectedTime: findUserInsession.selectedTime,
                    selectedDate: `${year}-${month + 1}-${dates} ${hoursOne}:${minutesOne}`,
                    isLive: ((days < 0 && hours >= 0 && minutes >= 0) || (days == 0 && hours == 0 && minutes == 0)) == true ? true : false,
                    RoomType: findUserInsession.RoomType,
                    cretedSessionUserId: findUserDeatil ? findUserDeatil._id : "",
                    cretedSessionUserphoto: findUserDeatil.photo ? findUserDeatil.photo[0] ? findUserDeatil.photo[0].res : "" : "",
                    cretedSessionUsername: findUserDeatil ? findUserDeatil.firstName : "",
                    isStart: ((days < 0 && hours >= 0 && minutes >= 0) || (days == 0 && hours == 0 && minutes == 0)) == true ? true : false,
                    participants: []

                }

                mySession.push(response)
            } else if (findUserDeatil && findParticipantsiUserDeatil1 == null && findParticipantsiUserDeatil2 && findParticipantsiUserDeatil3) {
                const response = {
                    _id: findUserInsession._id,
                    selectedTime: findUserInsession.selectedTime,
                    selectedDate: `${year}-${month + 1}-${dates} ${hoursOne}:${minutesOne}`,
                    isLive: ((days < 0 && hours >= 0 && minutes >= 0) || (days == 0 && hours == 0 && minutes == 0)) == true ? true : false,
                    RoomType: findUserInsession.RoomType,
                    cretedSessionUserId: findUserDeatil ? findUserDeatil._id : "",
                    cretedSessionUserphoto: findUserDeatil.photo ? findUserDeatil.photo[0] ? findUserDeatil.photo[0].res : "" : "",
                    cretedSessionUsername: findUserDeatil ? findUserDeatil.firstName : "",
                    isStart: ((days < 0 && hours >= 0 && minutes >= 0) || (days == 0 && hours == 0 && minutes == 0)) == true ? true : false,
                    participants: [
                        {
                            _id: findParticipantsiUserDeatil2 ? findParticipantsiUserDeatil2._id : "",
                            photo: findParticipantsiUserDeatil2 == null ? "" : findParticipantsiUserDeatil2.photo[0] ? findParticipantsiUserDeatil2.photo[0].res : "",
                            name: findParticipantsiUserDeatil2 == null ? "" : findParticipantsiUserDeatil2.firstName
                        },
                        {
                            _id: findParticipantsiUserDeatil3 ? findParticipantsiUserDeatil3._id : "",
                            photo: findParticipantsiUserDeatil3 == null ? " " : findParticipantsiUserDeatil3.photo[0] ? findParticipantsiUserDeatil3.photo[0].res : "",
                            name: findParticipantsiUserDeatil3 == null ? "" : findParticipantsiUserDeatil3.firstName
                        }
                    ]

                }

                mySession.push(response)
            } else if (findUserDeatil && findParticipantsiUserDeatil1 && findParticipantsiUserDeatil2 == null && findParticipantsiUserDeatil3) {
                const response = {
                    _id: findUserInsession._id,
                    selectedTime: findUserInsession.selectedTime,
                    selectedDate: `${year}-${month + 1}-${dates} ${hoursOne}:${minutesOne}`,
                    isLive: ((days < 0 && hours >= 0 && minutes >= 0) || (days == 0 && hours == 0 && minutes == 0)) == true ? true : false,
                    RoomType: findUserInsession.RoomType,
                    cretedSessionUserId: findUserDeatil ? findUserDeatil._id : "",
                    cretedSessionUserphoto: findUserDeatil.photo ? findUserDeatil.photo[0] ? findUserDeatil.photo[0].res : "" : "",
                    cretedSessionUsername: findUserDeatil ? findUserDeatil.firstName : "",
                    isStart: ((days < 0 && hours >= 0 && minutes >= 0) || (days == 0 && hours == 0 && minutes == 0)) == true ? true : false,
                    participants: [
                        {
                            _id: findParticipantsiUserDeatil1 ? findParticipantsiUserDeatil1._id : "",
                            photo: findParticipantsiUserDeatil1 == null ? "" : findParticipantsiUserDeatil1.photo[0] ? findParticipantsiUserDeatil1.photo[0].res : "",
                            name: findParticipantsiUserDeatil1 == null ? "" : findParticipantsiUserDeatil1.firstName
                        }, {
                            _id: findParticipantsiUserDeatil3 ? findParticipantsiUserDeatil3._id : "",
                            photo: findParticipantsiUserDeatil3 == null ? " " : findParticipantsiUserDeatil3.photo[0] ? findParticipantsiUserDeatil3.photo[0].res : "",
                            name: findParticipantsiUserDeatil3 == null ? "" : findParticipantsiUserDeatil3.firstName
                        }
                    ]
                }

                mySession.push(response)
            } else if (findUserDeatil && findParticipantsiUserDeatil1 && findParticipantsiUserDeatil2 && findParticipantsiUserDeatil3 == null) {
                const response = {
                    _id: findUserInsession._id,
                    selectedTime: findUserInsession.selectedTime,
                    selectedDate: `${year}-${month + 1}-${dates} ${hoursOne}:${minutesOne}`,
                    isLive: ((days < 0 && hours >= 0 && minutes >= 0) || (days == 0 && hours == 0 && minutes == 0)) == true ? true : false,
                    RoomType: findUserInsession.RoomType,
                    cretedSessionUserId: findUserDeatil ? findUserDeatil._id : "",
                    cretedSessionUserphoto: findUserDeatil.photo ? findUserDeatil.photo[0] ? findUserDeatil.photo[0].res : "" : "",
                    cretedSessionUsername: findUserDeatil ? findUserDeatil.firstName : "",
                    isStart: ((days < 0 && hours >= 0 && minutes >= 0) || (days == 0 && hours == 0 && minutes == 0)) == true ? true : false,
                    participants: [
                        {
                            _id: findParticipantsiUserDeatil1 ? findParticipantsiUserDeatil1._id : "",
                            photo: findParticipantsiUserDeatil1 == null ? "" : findParticipantsiUserDeatil1.photo[0] ? findParticipantsiUserDeatil1.photo[0].res : "",
                            name: findParticipantsiUserDeatil1 == null ? "" : findParticipantsiUserDeatil1.firstName
                        },
                        {
                            _id: findParticipantsiUserDeatil2 ? findParticipantsiUserDeatil2._id : "",
                            photo: findParticipantsiUserDeatil2 == null ? "" : findParticipantsiUserDeatil2.photo[0] ? findParticipantsiUserDeatil2.photo[0].res : "",
                            name: findParticipantsiUserDeatil2 == null ? " " : findParticipantsiUserDeatil2.firstName
                        }
                    ]
                }

                mySession.push(response)
            }
        } else if (findUserInsession.sessionEndOrNot == true) {
            if (findUserDeatil && findParticipantsiUserDeatil1 && findParticipantsiUserDeatil2 && findParticipantsiUserDeatil3) {
                const response = {
                    _id: findUserInsession._id,
                    selectedTime: findUserInsession.selectedTime,
                    selectedDate: `${year}-${month + 1}-${dates} ${hoursOne}:${minutesOne}`,
                    isLive: false,
                    RoomType: findUserInsession.RoomType,
                    cretedSessionUserId: findUserDeatil ? findUserDeatil._id : "",
                    cretedSessionUserphoto: findUserDeatil.photo ? findUserDeatil.photo[0] ? findUserDeatil.photo[0].res : "" : "",
                    cretedSessionUsername: findUserDeatil ? findUserDeatil.firstName : "",
                    isStart: false,
                    participants: [
                        {
                            _id: findParticipantsiUserDeatil1 ? findParticipantsiUserDeatil1._id : "",
                            photo: findParticipantsiUserDeatil1 == null ? "" : findParticipantsiUserDeatil1.photo[0] ? findParticipantsiUserDeatil1.photo[0].res : "",
                            name: findParticipantsiUserDeatil1 == null ? "" : findParticipantsiUserDeatil1.firstName
                        },
                        {
                            _id: findParticipantsiUserDeatil2 ? findParticipantsiUserDeatil2._id : "",
                            photo: findParticipantsiUserDeatil2 == null ? "" : findParticipantsiUserDeatil2.photo[0] ? findParticipantsiUserDeatil2.photo[0].res : "",
                            name: findParticipantsiUserDeatil2 == null ? " " : findParticipantsiUserDeatil2.firstName
                        },
                        {
                            _id: findParticipantsiUserDeatil3 ? findParticipantsiUserDeatil3._id : "",
                            photo: findParticipantsiUserDeatil3 == null ? " " : findParticipantsiUserDeatil3.photo[0] ? findParticipantsiUserDeatil3.photo[0].res : "",
                            name: findParticipantsiUserDeatil3 == null ? "" : findParticipantsiUserDeatil3.firstName
                        }
                    ]
                }

                mySession.push(response)
            } else if (findUserDeatil && findParticipantsiUserDeatil1 == null && findParticipantsiUserDeatil2 == null && findParticipantsiUserDeatil3 == null) {
                const response = {
                    _id: findUserInsession._id,
                    selectedTime: findUserInsession.selectedTime,
                    selectedDate: `${year}-${month + 1}-${dates} ${hoursOne}:${minutesOne}`,
                    isLive: false,
                    RoomType: findUserInsession.RoomType,
                    cretedSessionUserId: findUserDeatil ? findUserDeatil._id : "",
                    cretedSessionUserphoto: findUserDeatil.photo ? findUserDeatil.photo[0] ? findUserDeatil.photo[0].res : "" : "",
                    cretedSessionUsername: findUserDeatil ? findUserDeatil.firstName : "",
                    isStart: false,
                    participants: []

                }

                mySession.push(response)
            } else if (findUserDeatil && findParticipantsiUserDeatil1 == null && findParticipantsiUserDeatil2 && findParticipantsiUserDeatil3) {
                const response = {
                    _id: findUserInsession._id,
                    selectedTime: findUserInsession.selectedTime,
                    selectedDate: `${year}-${month + 1}-${dates} ${hoursOne}:${minutesOne}`,
                    isLive: false,
                    RoomType: findUserInsession.RoomType,
                    cretedSessionUserId: findUserDeatil ? findUserDeatil._id : "",
                    cretedSessionUserphoto: findUserDeatil.photo ? findUserDeatil.photo[0] ? findUserDeatil.photo[0].res : "" : "",
                    cretedSessionUsername: findUserDeatil ? findUserDeatil.firstName : "",
                    isStart: false,
                    participants: [
                        {
                            _id: findParticipantsiUserDeatil2 ? findParticipantsiUserDeatil2._id : "",
                            photo: findParticipantsiUserDeatil2 == null ? "" : findParticipantsiUserDeatil2.photo[0] ? findParticipantsiUserDeatil2.photo[0].res : "",
                            name: findParticipantsiUserDeatil2 == null ? " " : findParticipantsiUserDeatil2.firstName
                        },
                        {
                            _id: findParticipantsiUserDeatil3 ? findParticipantsiUserDeatil3._id : "",
                            photo: findParticipantsiUserDeatil3 == null ? " " : findParticipantsiUserDeatil3.photo[0] ? findParticipantsiUserDeatil3.photo[0].res : "",
                            name: findParticipantsiUserDeatil3 == null ? "" : findParticipantsiUserDeatil3.firstName
                        }
                    ]

                }

                mySession.push(response)
            } else if (findUserDeatil && findParticipantsiUserDeatil1 && findParticipantsiUserDeatil2 == null && findParticipantsiUserDeatil3) {
                const response = {
                    _id: findUserInsession._id,
                    selectedTime: findUserInsession.selectedTime,
                    selectedDate: `${year}-${month + 1}-${dates} ${hoursOne}:${minutesOne}`,
                    isLive: false,
                    RoomType: findUserInsession.RoomType,
                    cretedSessionUserId: findUserDeatil ? findUserDeatil._id : "",
                    cretedSessionUserphoto: findUserDeatil.photo ? findUserDeatil.photo[0] ? findUserDeatil.photo[0].res : "" : "",
                    cretedSessionUsername: findUserDeatil ? findUserDeatil.firstName : "",
                    isStart: false,
                    participants: [
                        {
                            _id: findParticipantsiUserDeatil1 ? findParticipantsiUserDeatil1._id : "",
                            photo: findParticipantsiUserDeatil1 == null ? "" : findParticipantsiUserDeatil1.photo[0] ? findParticipantsiUserDeatil1.photo[0].res : "",
                            name: findParticipantsiUserDeatil1 == null ? "" : findParticipantsiUserDeatil1.firstName
                        }, {
                            _id: findParticipantsiUserDeatil3 ? findParticipantsiUserDeatil3._id : "",
                            photo: findParticipantsiUserDeatil3 == null ? " " : findParticipantsiUserDeatil3.photo[0] ? findParticipantsiUserDeatil3.photo[0].res : "",
                            name: findParticipantsiUserDeatil3 == null ? "" : findParticipantsiUserDeatil3.firstName
                        }
                    ]
                }

                mySession.push(response)
            } else if (findUserDeatil && findParticipantsiUserDeatil1 && findParticipantsiUserDeatil2 && findParticipantsiUserDeatil3 == null) {
                const response = {
                    _id: findUserInsession._id,
                    selectedTime: findUserInsession.selectedTime,
                    selectedDate: `${year}-${month + 1}-${dates} ${hoursOne}:${minutesOne}`,
                    isLive: false,
                    RoomType: findUserInsession.RoomType,
                    cretedSessionUserId: findUserDeatil ? findUserDeatil._id : "",
                    cretedSessionUserphoto: findUserDeatil.photo ? findUserDeatil.photo[0] ? findUserDeatil.photo[0].res : "" : "",
                    cretedSessionUsername: findUserDeatil ? findUserDeatil.firstName : "",
                    isStart: false,
                    participants: [
                        {
                            _id: findParticipantsiUserDeatil1 ? findParticipantsiUserDeatil1._id : "",
                            photo: findParticipantsiUserDeatil1 == null ? "" : findParticipantsiUserDeatil1.photo[0] ? findParticipantsiUserDeatil1.photo[0].res : "",
                            name: findParticipantsiUserDeatil1 == null ? "" : findParticipantsiUserDeatil1.firstName
                        },
                        {
                            _id: findParticipantsiUserDeatil2 ? findParticipantsiUserDeatil2._id : "",
                            photo: findParticipantsiUserDeatil2 == null ? "" : findParticipantsiUserDeatil2.photo[0] ? findParticipantsiUserDeatil2.photo[0].res : "",
                            name: findParticipantsiUserDeatil2 == null ? " " : findParticipantsiUserDeatil2.firstName
                        }
                    ]
                }

                mySession.push(response)
            }
        }

        if (mySession[0] == undefined) {
            res.status(status.OK).json({
                "message": "don't create Any Session!",
                "status": true,
                "code": 200,
                "statusCode": 1,
                "data": []

            })
        } else {
            res.status(status.OK).json({
                "message": "successfully Show Session!",
                "status": true,
                "code": 200,
                "statusCode": 1,
                "data": mySession

            })
        }
    } catch (error) {
        console.log("error", error);
        res.status(status.INTERNAL_SERVER_ERROR).json(
            new APIResponse("Something Went Wrong", "false", 500, "0", error.message)
        )
    }
}

exports.userList = async (req, res, next) => {
    try {


        const findUser = await sessionModel.findOne({
            _id: req.params.session_id
        })

        if (findUser) {

            const findUser = await sessionComment.findOne({
                sessionId: req.params.session_id
            })

            if (findUser) {
                const data = findUser.joinUser

                const final_response = [];
                for (const res of data) {

                    if (res.status == 3) {
                        const findUser = await userModel.findOne({
                            _id: res.userId
                        })

                        const response = {
                            userId: findUser._id,
                            userName: findUser.firstName,
                            profile: findUser.photo[0] ? findUser.photo[0].res : "",
                        }

                        final_response.push(response)
                    }


                }

                res.status(status.OK).json(
                    new APIResponse("show join user list", "true", 200, "1", final_response)
                )
            } else {
                res.status(status.OK).json(
                    new APIResponse("no data found", "true", 200, "1", [])
                )
            }




        } else {
            res.status(status.NOT_FOUND).json(
                new APIResponse("session not found", "false", 404, "0")
            )
        }

    } catch (error) {
        console.log("Error:", error);
        res.status(status.INTERNAL_SERVER_ERROR).json(
            new APIResponse("Something Went Wrong", "false", 500, "0", error.message)
        )
    }
}


exports.uploadImages = async (req, res, next) => {
    try {
        const cloudinaryImageUploadMethod = async file => {
            return new Promise(resolve => {
                cloudinary.uploader.upload(file, (err, res) => {
                    if (err) return res.status(500).send("upload image error")
                    resolve({
                        res: res.secure_url
                    })
                })
            })
        }


        const id = req.params.user_id;
        const userFindForImages = await userModel.findOne({ _id: id, polyDating: 0 });

        if (userFindForImages) {

            const urls = [];
            const files = req.files.upload;
            console.log("files:::", files);

            for (const file of files) {
                const { path } = file

                const newPath = await cloudinaryImageUploadMethod(path);
                urls.push(newPath);
            }

            const findUser = await sessionComment.findOne({
                sessionId: mongoose.Types.ObjectId(req.params.session_id),
                "upload.userId": req.params.user_id

            })

            const access = await sessionModel.findOne({
                _id: req.params.session_id,
                $or: [{
                    "participants.participants_1": req.params.user_id
                }, {
                    "participants.participants_2": req.params.user_id
                }, {
                    "participants.participants_3": req.params.user_id
                }]

            })


            if (access) {
                if (findUser) {
                    await sessionComment.updateOne({
                        sessionId: mongoose.Types.ObjectId(req.params.session_id),
                        "upload.userId": req.params.user_id
                    }, {
                        $push: {
                            "upload.$.uploadImgOrVideo": [...urls],
                        }
                    })

                    res.status(status.CREATED).json(
                        new APIResponse("image upload", "true", 201, "1")
                    )
                } else {


                    await sessionComment.updateOne({
                        sessionId: mongoose.Types.ObjectId(req.params.session_id)
                    }, {
                        $push: {
                            upload: {
                                userId: req.params.user_id,
                                uploadImgOrVideo: [urls],
                                userName: userFindForImages.firstName,
                                profile: userFindForImages.photo[0] ? userFindForImages.photo[0].res : ""
                            }
                        }

                    })

                    res.status(status.CREATED).json(
                        new APIResponse("image upload", "true", 201, "1")
                    )
                }
            } else {
                res.status(status.NOT_FOUND).json(
                    new APIResponse("this user not participant", "false", 404, "0")
                )
            }
        } else {
            res.status(status.NOT_FOUND).json(
                new APIResponse("User not found and not Social Meida & Dating type user", "false", 404, "0")
            )
        }

    } catch (error) {
        console.log("Error:", error);
        res.status(status.INTERNAL_SERVER_ERROR).json(
            new APIResponse("Something Went Wrong", "false", 500, "0", error.message)
        )
    }
}

exports.uploadVideos = async (req, res, next) => {
    try {
        const cloudinaryImageUploadMethod = async file => {
            return new Promise(resolve => {
                cloudinary.uploader.upload(file, { resource_type: "video" }, (err, res) => {
                    if (err) return res.status(500).send("upload image error")
                    resolve({
                        res: res.secure_url
                    })
                })
            })
        }

        const id = req.params.user_id;
        const userFindForVideos = await userModel.findOne({ _id: id, polyDating: 0 });


        if (userFindForVideos) {

            const urls = [];
            const files = req.files.upload;

            for (const file of files) {
                const { path } = file

                const newPath = await cloudinaryImageUploadMethod(path);
                urls.push(newPath);
            }


            const findUser = await sessionComment.findOne({
                sessionId: mongoose.Types.ObjectId(req.params.session_id),
                "upload.userId": req.params.user_id

            })

            const access = await sessionModel.findOne({
                _id: req.params.session_id,
                $or: [{
                    "participants.participants_1": req.params.user_id
                }, {
                    "participants.participants_2": req.params.user_id
                }, {
                    "participants.participants_3": req.params.user_id
                }]

            })

            if (access) {

                if (findUser) {
                    await sessionComment.updateOne({
                        sessionId: mongoose.Types.ObjectId(req.params.session_id),
                        "upload.userId": req.params.user_id
                    }, {
                        $push: {
                            "upload.$.uploadImgOrVideo": [...urls],
                        }
                    })

                    res.status(status.CREATED).json(
                        new APIResponse("video upload", "true", 201, "1")
                    )
                } else {
                    await sessionComment.updateOne({
                        sessionId: mongoose.Types.ObjectId(req.params.session_id)
                    }, {
                        $push: {
                            upload: {
                                userId: req.params.user_id,
                                uploadImgOrVideo: [urls],
                                userName: userFindForVideos.firstName,
                                profile: userFindForVideos.photo[0] ? userFindForVideos.photo[0].res : ""
                            }
                        }

                    })

                    res.status(status.CREATED).json(
                        new APIResponse("video upload", "true", 201, "1")
                    )
                }

            } else {
                res.status(status.NOT_FOUND).json(
                    new APIResponse("this user not participant", "false", 404, "0")
                )
            }
        } else {
            res.status(status.NOT_FOUND).json(
                new APIResponse("User not found and not Social Meida & Dating type user", "false", 404, "0")
            )
        }

    } catch (error) {
        console.log("Error:", error);
        res.status(status.INTERNAL_SERVER_ERROR).json(
            new APIResponse("Something Went Wrong", "false", 500, "0", error.message)
        )
    }
}

exports.getUploadeVedioOrImages = async (req, res, next) => {

    try {

        const sessionIds = await sessionModel.findOne({
            _id: req.params.session_id
        })

        const paricipant = [];
        const p1 = sessionIds.participants[0].participants_1 == null ? "" : sessionIds.participants[0].participants_1
        const p2 = sessionIds.participants[0].participants_2 == null ? "" : sessionIds.participants[0].participants_2
        const p3 = sessionIds.participants[0].participants_3 == null ? "" : sessionIds.participants[0].participants_3
        if (p1) {
            paricipant.push((sessionIds.participants[0].participants_1).toString())
        } if (p2) {
            paricipant.push((sessionIds.participants[0].participants_2).toString())
        } if (p3) {
            paricipant.push((sessionIds.participants[0].participants_3).toString())
        }


        if (sessionIds) {


            const sessionId = await sessionComment.findOne({
                sessionId: req.params.session_id
            })

            if (sessionId) {
                const data = sessionId.upload

                const id = [];
                if (data[0] == undefined) {



                    const final_response = [];
                    for (const ids of paricipant) {
                        const findUser = await userModel.findOne({
                            _id: ids
                        })
                        const res = {
                            userId: findUser._id,
                            userName: findUser.firstName,
                            profile: findUser.photo[0] ? findUser.photo[0].res : "",
                            img: []
                        }
                        final_response.push(res)
                    }


                    res.status(status.OK).json(
                        new APIResponse("show all uploder", "true", 200, "1", final_response)
                    )
                } else {
                    var imgFinal = []
                    const final_response = []
                    for (const allData of data) {

                        for (const uploadImages of allData.uploadImgOrVideo) {


                            for (const img of uploadImages) {

                                const getExt1Name = path.extname(img.res);
                                if (getExt1Name == ".mp4" || getExt1Name == ".mov" || getExt1Name == ".avi" || getExt1Name == ".wmv" || getExt1Name == ".m3u8" || getExt1Name == ".webm" || getExt1Name == ".flv" || getExt1Name == ".ts" || getExt1Name == ".3gp") {
                                    imgFinal.push({
                                        res: img.res,
                                        type: "video",
                                    })
                                } else {
                                    imgFinal.push({
                                        res: img.res,
                                        type: "image"
                                    })
                                }

                            }


                        }



                        id.push((allData.userId).toString())
                        const res = {
                            userId: allData.userId,
                            userName: allData.userName,
                            profile: allData.profile,
                            img: imgFinal
                        }
                        final_response.push(res)
                        var imgFinal = []
                    }

                    const unique = paricipant.filter(obj => id.indexOf(obj) == -1)

                    for (const ids of unique) {
                        const findUser = await userModel.findOne({
                            _id: ids
                        })
                        const res = {
                            userId: findUser._id,
                            userName: findUser.firstName,
                            profile: findUser.photo[0] ? findUser.photo[0].res : "",
                            img: []
                        }
                        final_response.push(res)
                    }
                    res.status(status.OK).json(
                        new APIResponse("show all uploder", "true", 200, "1", final_response)
                    )
                }

            } else {

                res.status(status.OK).json(
                    new APIResponse("no data found", "true", 200, "1", [])
                )
            }



        } else {

            res.status(status.NOT_FOUND).json(
                new APIResponse("session not found", "false", 404, "0")
            )
        }

    } catch (error) {
        console.log("error", error);
        res.status(status.INTERNAL_SERVER_ERROR).json(
            new APIResponse("Something Went Wrong", "false", 500, "0", error.message)
        )
    }

}


exports.commentSessionList = async (req, res, next) => {
    try {


        const data = await sessionModel.findOne({
            _id: req.params.session_id
        })

        if (data) {

            const data = await sessionComment.findOne({
                sessionId: req.params.session_id
            })

            if (data) {
                const final_response = [];
                const response = data.commentWithUser



                for (const joinUser of data.joinUser) {
                    for (const res of response) {


                        const findUser = await userModel.findOne({
                            _id: res.userId
                        })

                        if ((joinUser.userId).toString() == (res.userId).toString()) {
                            const commentData = {
                                userId: res.userId,
                                comment: res.comment,
                                userName: res.userName,
                                profile: findUser.photo[0] ? findUser.photo[0].res : "",
                                status: joinUser.status ? joinUser.status : 1
                            }

                            final_response.push(commentData)
                        } else if ((data.cretedSessionUser).toString() == (res.userId).toString()) {
                            const commentData = {
                                userId: res.userId,
                                comment: res.comment,
                                userName: res.userName,
                                profile: findUser.photo[0] ? findUser.photo[0].res : "",
                                status: 1
                            }

                            final_response.push(commentData)
                        }
                    }
                }

                res.status(status.OK).json(
                    new APIResponse("comment list", "true", 200, "1", final_response)
                )
            } else {
                res.status(status.OK).json(
                    new APIResponse("data not found", "true", 200, "1", [])
                )
            }
        } else {
            res.status(status.NOT_FOUND).json(
                new APIResponse("session not found", "false", 404, "0")
            )
        }


    } catch (error) {
        console.log("error", error);
        res.status(status.INTERNAL_SERVER_ERROR).json(
            new APIResponse("Something Went Wrong", "false", 500, "0", error.message)
        )
    }
}

exports.thumbUpCountInSession = async (req, res, next) => {
    try {

        const findSession = await sessionModel.findOne({
            _id: mongoose.Types.ObjectId(req.params.session_id)
        })

        if (findSession) {

            const findSession = await sessionModel.findOne({
                sessionId: mongoose.Types.ObjectId(req.params.session_id)
            })
            if (findSession) {
                const findParticipant = await sessionComment.findOne({
                    sessionId: req.params.session_id,
                    $or: [{
                        "participants.participants_1.userId": req.params.participants_id
                    }, {
                        "participants.participants_2.userId": req.params.participants_id
                    }, {
                        "participants.participants_3.userId": req.params.participants_id
                    }]

                })

                if (findParticipant) {

                    const findSession = await thumbUpCountInSession.findOne({
                        sessionId: req.params.session_id
                    })

                    if (findSession) {
                        await thumbUpCountInSession.updateOne({
                            sessionId: req.params.session_id,
                        }, {
                            $push: {
                                thumbupUserId: {
                                    userId: req.params.user_id,
                                    participantUserId: req.params.participants_id
                                }
                            }
                        })


                    } else {

                        const data = thumbUpCountInSession({
                            sessionId: req.params.session_id,
                            thumbupUserId: {
                                userId: req.params.user_id,
                                participantUserId: req.params.participants_id
                            }
                        })

                        await data.save();

                    }



                    const findParticipant1 = await sessionComment.findOne({
                        sessionId: req.params.session_id,
                        "participants.participants_1.userId": req.params.participants_id
                    })
                    const findParticipant2 = await sessionComment.findOne({
                        sessionId: req.params.session_id,
                        "participants.participants_2.userId": req.params.participants_id
                    })
                    const findParticipant3 = await sessionComment.findOne({
                        sessionId: req.params.session_id,
                        "participants.participants_3.userId": req.params.participants_id
                    })


                    if (findParticipant1) {
                        await sessionComment.updateOne({
                            sessionId: req.params.session_id,
                            "participants.participants_1.userId": req.params.participants_id
                        },
                            { $inc: { "participants.participants_1.thumbUp": 1 } },
                            { arrayFilters: [{ "i.userId": req.params.participants_id }] }
                        )
                    } else if (findParticipant2) {
                        await sessionComment.updateOne({
                            sessionId: req.params.session_id,
                            "participants.participants_2.userId": req.params.participants_id
                        },
                            { $inc: { "participants.participants_2.thumbUp": 1 } },
                            { arrayFilters: [{ "i.userId": req.params.participants_id }] }
                        )
                    } else if (findParticipant3) {
                        await sessionComment.updateOne({
                            sessionId: req.params.session_id,
                            "participants.participants_3.userId": req.params.participants_id
                        },
                            { $inc: { "participants.participants_3.thumbUp": 1 } },
                            { arrayFilters: [{ "i.userId": req.params.participants_id }] }
                        )
                    }

                    const data = await sessionComment.findOne({
                        sessionId: req.params.session_id
                    })

                    const participantData = [];
                    for (const res of data.participants) {


                        if (res.participants_1[0] == undefined) {

                        } else {
                            const findUser1 = await userModel.findOne({
                                _id: res.participants_1[0].userId
                            })

                            console.log(findUser1);
                            const response = {
                                participants_1: {
                                    userId: findUser1._id,
                                    profile: findUser1.photo[0] ? findUser1.photo[0].res : "",
                                    userName: findUser1.firstName,
                                    thumbUp: res.participants_1[0].thumbUp
                                }
                            }
                            participantData.push(response)

                        }


                        if (res.participants_2[0] == undefined) {

                        } else {

                            const findUser2 = await userModel.findOne({
                                _id: res.participants_2[0].userId
                            })

                            const response = {
                                participants_2: {
                                    userId: findUser2._id,
                                    profile: findUser2.photo[0] ? findUser2.photo[0].res : "",
                                    userName: findUser2.firstName,
                                    thumbUp: res.participants_2[0].thumbUp
                                }
                            }
                            participantData.push(response)
                        }


                        if (res.participants_3[0] == undefined) {

                        } else {
                            const findUser3 = await userModel.findOne({
                                _id: res.participants_3[0].userId
                            })

                            const response = {
                                participants_3: {
                                    userId: findUser3._id,
                                    profile: findUser3.photo[0] ? findUser3.photo[0].res : "",
                                    userName: findUser3.firstName,
                                    thumbUp: res.participants_3[0].thumbUp
                                }
                            }
                            participantData.push(response)
                        }



                    }


                    const final_response = {
                        session_id: data.sessionId,
                        cretedSessionUser: data.cretedSessionUser,
                        participantData
                    }

                    res.status(status.OK).json(
                        new APIResponse("participant list with thumbUp", "true", 200, "1", final_response)
                    )


                } else {

                    const findSession = await thumbUpCountInSession.findOne({
                        sessionId: req.params.session_id
                    })

                    if (findSession) {

                        await thumbUpCountInSession.updateOne({
                            sessionId: req.params.session_id,
                        }, {
                            $push: {
                                thumbupUserId: {
                                    userId: req.params.user_id,
                                    participantUserId: req.params.participants_id
                                }
                            }
                        })


                    } else {

                        const data = thumbUpCountInSession({
                            sessionId: req.params.session_id,
                            thumbupUserId: {
                                userId: req.params.user_id,
                                participantUserId: req.params.participants_id
                            }
                        })

                        await data.save();


                    }

                    // console.log("req.params.session_id", req.params.session_id);

                    const findParticipant1 = await sessionComment.findOne({
                        sessionId: req.params.session_id
                    })

                    if (findParticipant1.participants[0] == undefined) {
                        await sessionComment.updateOne({
                            sessionId: req.params.session_id,
                        },
                            {
                                $set: {
                                    "participants.participants_1": {
                                        userId: req.params.participants_id,
                                        thumbUp: 1
                                    }

                                }
                            }
                        )
                    } else if (findParticipant1.participants[0].participants_2[0] == undefined) {
                        await sessionComment.updateOne({
                            sessionId: req.params.session_id,
                        },
                            {
                                $set: {
                                    "participants.participants_2": {
                                        userId: req.params.participants_id,
                                        thumbUp: 1
                                    }
                                }
                            }
                        )
                    } else if (findParticipant1.participants[0].participants_3[0] == undefined) {
                        await sessionComment.updateOne({
                            sessionId: req.params.session_id,
                        },
                            {
                                $set: {
                                    "participants.participants_3": {
                                        userId: req.params.participants_id,
                                        thumbUp: 1
                                    }
                                }
                            }
                        )
                    }
                    // console.log("findParticipant1[0].participants_1[0].userId" , findParticipant1.participants[0].participants_1[0].userId);
                    // if()
                    // if()



                    const data = await sessionComment.findOne({
                        sessionId: req.params.session_id
                    })

                    const participantData = [];
                    for (const res of data.participants) {

                        // console.log("res.participants_1[0] ", res.participants_1[0]);
                        if (res.participants_1[0] == undefined) {

                        } else {
                            const findUser1 = await userModel.findOne({
                                _id: res.participants_1[0].userId
                            })

                            // console.log(findUser1);
                            const response = {
                                participants_1: {
                                    userId: findUser1._id,
                                    profile: findUser1.photo[0] ? findUser1.photo[0].res : "",
                                    userName: findUser1.firstName,
                                    thumbUp: res.participants_1[0].thumbUp
                                }
                            }
                            participantData.push(response)

                        }


                        if (res.participants_2[0] == undefined) {

                        } else {

                            const findUser2 = await userModel.findOne({
                                _id: res.participants_2[0].userId
                            })

                            const response = {
                                participants_2: {
                                    userId: findUser2._id,
                                    profile: findUser2.photo[0] ? findUser2.photo[0].res : "",
                                    userName: findUser2.firstName,
                                    thumbUp: res.participants_2[0].thumbUp
                                }
                            }
                            participantData.push(response)
                        }


                        if (res.participants_3[0] == undefined) {

                        } else {
                            const findUser3 = await userModel.findOne({
                                _id: res.participants_3[0].userId
                            })

                            const response = {
                                participants_3: {
                                    userId: findUser3._id,
                                    profile: findUser3.photo[0] ? findUser3.photo[0].res : "",
                                    userName: findUser3.firstName,
                                    thumbUp: res.participants_3[0].thumbUp
                                }
                            }
                            participantData.push(response)
                        }



                    }


                    const final_response = {
                        session_id: data.sessionId,
                        cretedSessionUser: data.cretedSessionUser,
                        participantData
                    }

                    res.status(status.OK).json(
                        new APIResponse("participant list with thumbUp", "true", 200, "1", final_response)
                    )


                }
            } else {

                res.status(status.OK).json(
                    new APIResponse("no data found", "true", 200, "1", [])
                )
            }


        } else {
            res.status(status.NOT_FOUND).json(
                new APIResponse("session not found", "false", 404, "0")
            )
        }

    } catch (error) {
        console.log("error", error);
        res.status(status.INTERNAL_SERVER_ERROR).json(
            new APIResponse("Something Went Wrong", "false", 500, "0", error.message)
        )
    }
}


exports.sessionInfo = async (req, res, next) => {
    try {

        const sessionFind = await sessionModel.findOne({
            _id: req.params.session_id
        })

        if (sessionFind) {

            const session = await sessionComment.findOne({
                sessionId: req.params.session_id
            })

            if (session) {

                const allPrticipant = [];


                // const p1 = sessionFind.participants[0].participants_1 == null ? "" : sessionFind.participants[0].participants_1
                // const p2 = sessionFind.participants[0].participants_2 == null ? "" : sessionFind.participants[0].participants_2
                // const p3 = sessionFind.participants[0].participants_3 == null ? "" : sessionFind.participants[0].participants_3

                // if (p1) {
                //     allPrticipant.push(sessionFind.participants[0].participants_1)
                // }
                // if (p2) {
                //     allPrticipant.push(sessionFind.participants[0].participants_2)
                // }
                // if (p3) {
                //     allPrticipant.push(sessionFind.participants[0].participants_3)
                // }

                for (const participant of session.joinUser) {
                    if (participant.status == 2) {
                        allPrticipant.push(participant.userId)
                    }
                }

                const InSession = session.liveSession

                if (InSession.participants_1[0] == undefined) {

                    const final_response = [];
                    for (const user of allPrticipant) {

                        const findUser = await userModel.findOne({
                            _id: user
                        })
                        const response = {
                            userId: (findUser._id).toString(),
                            profile: findUser.photo[0] ? findUser.photo[0].res : "",
                            userName: findUser.firstName,
                            sessionId: req.params.session_id,
                            status: 0
                        }

                        final_response.push(response)
                    }
                    res.status(status.OK).json(
                        new APIResponse("session information!", "true", 200, "1", final_response)
                    )



                } else {


                    const raiseHandUser = [];
                    const data = session.liveSession

                    raiseHandUser.push({
                        userId: data.participants_1[0].userId,
                        status: data.participants_1[0].allow
                    })

                    raiseHandUser.push({
                        userId: data.participants_2[0].userId,
                        status: data.participants_2[0].allow
                    })

                    raiseHandUser.push({
                        userId: data.participants_3[0].userId,
                        status: data.participants_3[0].allow
                    })


                    const final_response = [];
                    const userId = [];



                    for (const res of allPrticipant) {
                        for (const res1 of raiseHandUser) {
                            ;
                            if ((res).toString() == (res1.userId).toString()) {
                                console.log(res);
                                console.log(res1);
                                const findUser = await userModel.findOne({
                                    _id: res1.userId
                                })

                                const response = {
                                    userId: (findUser._id).toString(),
                                    profile: findUser.photo[0] ? findUser.photo[0].res : "",
                                    userName: findUser.firstName,
                                    sessionId: req.params.session_id,
                                    status: res1.status
                                }

                                final_response.push(response)
                                // userId.push(findUser._id)
                            } else {
                            }
                        }
                    }


                    // const ids = [...allPrticipant, ...userId]
                    // for (const findres of ids) {
                    //     for (const id of userId) {
                    //         if ((findres).toString() == (id).toString()) {

                    //         } else {
                    //             const findUser = await userModel.findOne({
                    //                 _id: ids
                    //             })

                    //             const response = {
                    //                 userId: (findUser._id).toString(),
                    //                 profile: findUser.photo[0] ? findUser.photo[0].res : "",
                    //                 userName: findUser.firstName,
                    //                 sessionId: req.params.session_id,
                    //                 status: 0
                    //             }

                    //             final_response.push(response)
                    //         }
                    //     }
                    // }
                    // let uniqueObjArray = [...new Map(final_response.map((item) => [item["userId"], item])).values()];

                    res.status(status.OK).json(
                        new APIResponse("session information!", "true", 200, "1", final_response)
                    )

                }

            } else {
                res.status(status.NOT_FOUND).json(
                    new APIResponse("session not live", "true", 404, "1",)
                )
            }

        } else {
            res.status(status.NOT_FOUND).json(
                new APIResponse("session not found", "true", 404, "1",)
            )
        }

    } catch (error) {
        console.log("error", error);
        res.status(status.INTERNAL_SERVER_ERROR).json(
            new APIResponse("Something Went Wrong", "false", 500, "0", error.message)
        )
    }
}


exports.listOfSessionInfo = async (req, res, next) => {
    try {

        const findSession = await sessionModel.findOne({
            _id: req.params.session_id
        })



        if (findSession) {

            const userList = []
            const p1 = findSession.participants[0].participants_1 == null ? "" : findSession.participants[0].participants_1
            const p2 = findSession.participants[0].participants_2 == null ? "" : findSession.participants[0].participants_2
            const p3 = findSession.participants[0].participants_3 == null ? "" : findSession.participants[0].participants_3




            userList.push({ userId: findSession.cretedSessionUser, intId: findSession.createUserIntId, status: 1 })

            if (p1) {
                userList.push({ userId: findSession.participants[0].participants_1, intId: findSession.participants[0].P1IntId, status: 2 })
            }
            if (p2) {
                userList.push({ userId: findSession.participants[0].participants_2, intId: findSession.participants[0].P2IntId, status: 2 })
            }
            if (p3) {
                userList.push({ userId: findSession.participants[0].participants_3, intId: findSession.participants[0].P3IntId, status: 2 })
            }

            const finalResponse = [];

            for (const user of userList) {

                const findUser = await userModel.findOne({
                    _id: user.userId
                })

                const response = {
                    sessionId: req.params.session_id,
                    userId: findUser._id,
                    userProfile: findUser.photo[0] ? findUser.photo[0].res : "",
                    intId: user.intId,
                    status: user.status
                }

                finalResponse.push(response)
            }

            res.status(status.OK).json(
                new APIResponse("session info list", "true", 200, "1", finalResponse)
            )

        } else {
            res.status(status.NOT_FOUND).json(
                new APIResponse("session not found", "true", 404, "1",)
            )
        }

    } catch (error) {
        console.log("error", error);
        res.status(status.INTERNAL_SERVER_ERROR).json(
            new APIResponse("Something Went Wrong", "false", 500, "0", error.message)
        )
    }
}


exports.likeSesison = async (req, res, next) => {
    try {

        const findSession = await sessionModel.findOne({
            _id: req.params.session_id
        })

        if (findSession) {

            const findParticipant = await sessionComment.findOne({
                session_id: req.params.session_id,
            })

            if (findParticipant) {

                const p1 = findSession.participants[0].participants_1 == null ? "" : findSession.participants[0].participants_1
                const p2 = findSession.participants[0].participants_2 == null ? "" : findSession.participants[0].participants_2
                const p3 = findSession.participants[0].participants_3 == null ? "" : findSession.participants[0].participants_3

                if ((p1).toString() == (req.params.participant_user_id).toString()) {
                    const findUser = await sessionComment.findOne({
                        sessionId: req.params.session_id,
                        "LikeSession.participants_1.likeUserId": req.params.user_id
                    })

                    if (findUser) {

                        res.status(status.ALREADY_REPORTED).json(
                            new APIResponse("like Already Added", "true", 208, "1")
                        )

                    } else {
                        await sessionComment.updateOne({
                            sessionId: req.params.session_id
                        }, {
                            $push: {
                                "LikeSession.participants_1": [{ likeUserId: req.params.user_id }]

                            }
                        }
                        )

                        res.status(status.OK).json(
                            new APIResponse("like Added SuccessFully", "true", 200, "1")
                        )
                    }


                } else if ((p2).toString() == (req.params.participant_user_id).toString()) {

                    const findUser = await sessionComment.findOne({
                        sessionId: req.params.session_id,
                        "LikeSession.participants_2.likeUserId": req.params.user_id
                    })

                    if (findUser) {

                        res.status(status.ALREADY_REPORTED).json(
                            new APIResponse("like Already Added", "true", 208, "1")
                        )

                    } else {
                        await sessionComment.updateOne({
                            sessionId: req.params.session_id
                        }, {
                            $push: {
                                "LikeSession.participants_2": [{ likeUserId: req.params.user_id }]

                            }
                        }
                        )

                        res.status(status.OK).json(
                            new APIResponse("like Added SuccessFully", "true", 200, "1")
                        )
                    }


                } else if ((p3).toString() == (req.params.participant_user_id).toString()) {

                    const findUser = await sessionComment.findOne({
                        sessionId: req.params.session_id,
                        "LikeSession.participants_3.likeUserId": req.params.user_id
                    })

                    if (findUser) {

                        res.status(status.ALREADY_REPORTED).json(
                            new APIResponse("like Already Added", "true", 208, "1")
                        )

                    } else {
                        await sessionComment.updateOne({
                            sessionId: req.params.session_id
                        }, {
                            $push: {
                                "LikeSession.participants_3": [{ likeUserId: req.params.user_id }]

                            }
                        }
                        )

                        res.status(status.OK).json(
                            new APIResponse("like Added SuccessFully", "true", 200, "1")
                        )
                    }
                }



            } else {
                res.status(status.NOT_FOUND).json(
                    new APIResponse("session not live", "true", 404, "1",)
                )
            }


        } else {
            res.status(status.NOT_FOUND).json(
                new APIResponse("session not found", "true", 404, "1",)
            )
        }
    } catch (error) {
        console.log("error", error);
        res.status(status.INTERNAL_SERVER_ERROR).json(
            new APIResponse("Something Went Wrong", "false", 500, "0", error.message)
        )
    }
}

exports.getLikeUserDetail = async (req, res, next) => {
    try {

        const findSession = await sessionModel.findOne({
            _id: req.params.session_id
        })

        if (findSession == null) {

            res.status(status.NOT_FOUND).json(
                new APIResponse("session not found", "true", 404, "1",)
            )

        } else {

            const findSessionComment = await sessionComment.findOne({
                sessionId: req.params.session_id
            })

            const user = findSessionComment
            const final_response = [];

            if (user.LikeSession.participants_3[0] == undefined) {
                console.log("111111111111111111");
                if (findSession.participants[0].participants_3 != null) {

                    const findUser = await userModel.findOne({
                        _id: findSession.participants[0].participants_3
                    })
                    console.log("iddd:::::::::::::", findSession);

                    if (findUser == null) {

                        // res.status(status.NOT_FOUND).json(
                        //     new APIResponse("User not Found", "false", 404, "0")
                        // )

                    } else {

                        const response = {
                            _id: findUser._id,
                            userName: findUser.firstName,
                            userProfile: findUser.photo[0] ? findUser.photo[0].res : "",
                            totalLikeCount: 0,
                            likeStatus: 0
                        }
                        final_response.push(response)

                    }

                }

            } else {
                console.log("222222222222222222222222");
                const count = (user.LikeSession.participants_3)
                const findUser = await userModel.findOne({
                    _id: findSession.participants[0].participants_3
                })

                const response = {
                    _id: findUser._id,
                    userName: findUser.firstName,
                    userProfile: findUser.photo[0] ? findUser.photo[0].res : "",
                    totalLikeCount: count.length,
                    likeStatus: 1
                }
                final_response.push(response)

            }

            if (user.LikeSession.participants_2[0] == undefined) {

                if (findSession.participants[0].participants_2 != null) {
                    console.log("------------------", findSession.participants[0].participants_2);
                    const findUser = await userModel.findOne({
                        _id: findSession.participants[0].participants_2
                    })
                    console.log("findUser:::", findUser);

                    if (findUser == null) {

                        // res.status(status.NOT_FOUND).json(
                        //     new APIResponse("User not Found", "false", 404, "0")
                        // )

                    } else {

                        const response = {
                            _id: findUser._id,
                            userName: findUser.firstName,
                            userProfile: findUser.photo[0] ? findUser.photo[0].res : "",
                            totalLikeCount: 0,
                            likeStatus: 0
                        }

                        final_response.push(response)

                    }

                }

            } else {
                console.log("44444444444444444444444");
                const count = (user.LikeSession.participants_2)
                const findUser = await userModel.findOne({
                    _id: findSession.participants[0].participants_2
                })

                const response = {
                    _id: findUser._id,
                    userName: findUser.firstName,
                    userProfile: findUser.photo[0] ? findUser.photo[0].res : "",
                    totalLikeCount: count.length,
                    likeStatus: 1
                }
                final_response.push(response)

            }

            if (user.LikeSession.participants_1[0] == undefined) {
                console.log("5555555555555555555555555555555");
                if (findSession.participants[0].participants_1 != null) {

                    const findUser = await userModel.findOne({
                        _id: findSession.participants[0].participants_1
                    });
                    console.log("findUser::55", findUser);

                    if (findUser == null) {

                        // res.status(status.NOT_FOUND).json(
                        //     new APIResponse("User not Found", "false", 404, "0")
                        // )

                    } else {

                        const response = {
                            _id: findUser._id,
                            userName: findUser.firstName,
                            userProfile: findUser.photo[0] ? findUser.photo[0].res : "",
                            totalLikeCount: 0,
                            likeStatus: 0
                        }
                        final_response.push(response)

                    }

                }

            } else {
                console.log("6666666666666666666666");
                const count = (user.LikeSession.participants_1)
                const findUser = await userModel.findOne({
                    _id: findSession.participants[0].participants_1
                })

                if (findUser == null) {

                    res.status(status.NOT_FOUND).json(
                        new APIResponse("User not Found", "false", 404, "0")
                    )

                } else {

                    const response = {
                        _id: findUser._id,
                        userName: findUser.firstName,
                        userProfile: findUser.photo[0] ? findUser.photo[0].res : "",
                        totalLikeCount: count.length,
                        likeStatus: 1
                    }
                    final_response.push(response)

                }

            }

            res.status(status.OK).json(
                new APIResponse("total like session user with count", "true", 200, "1", final_response)
            )

        }

    } catch (error) {

        console.log("Error::---", error);
        res.status(status.INTERNAL_SERVER_ERROR).json(
            new APIResponse("Something Went Wrong", "false", 500, "0", error.message)
        )

    }
}

exports.getLikeUserDetail2 = async (req, res, next) => {
    try {

        const findSession = await sessionModel.findOne({
            _id: req.params.session_id
        })

        if (findSession) {

            const findSessionComment = await sessionComment.findOne({
                sessionId: req.params.session_id
            })

            const user = findSessionComment

            const final_response = [];

            if (user.LikeSession.participants_3[0] == undefined) {

                if (findSession.participants[0].participants_3 != null) {

                    const findUser = await userModel.findOne({
                        _id: findSession.participants[0].participants_3
                    })
                    console.log("iddd:::::::::::::", findSession);
                    if (findUser == null) {

                        res.status(status.NOT_FOUND).json(
                            new APIResponse("User not Found", "false", 404, "0")
                        )

                    } else {

                        const response = {
                            _id: findUser._id,
                            userName: findUser.firstName,
                            userProfile: findUser.photo[0] ? findUser.photo[0].res : "",
                            totalLikeCount: 0,
                            likeStatus: 0
                        }
                        final_response.push(response)

                    }

                }

            } else {

                const count = (user.LikeSession.participants_3)

                const findUser = await userModel.findOne({
                    _id: findSession.participants[0].participants_3
                })

                const response = {
                    _id: findUser._id,
                    userName: findUser.firstName,
                    userProfile: findUser.photo[0] ? findUser.photo[0].res : "",
                    totalLikeCount: count.length,
                    likeStatus: 1
                }
                final_response.push(response)
            }

            if (user.LikeSession.participants_2[0] == undefined) {

                if (findSession.participants[0].participants_2 != null) {

                    const findUser = await userModel.findOne({
                        _id: findSession.participants[0].participants_2
                    })

                    if (findUser == null) {

                        res.status(status.NOT_FOUND).json(
                            new APIResponse("User not Found", "false", 404, "0")
                        )

                    } else {

                        const response = {
                            _id: findUser._id,
                            userName: findUser.firstName,
                            userProfile: findUser.photo[0] ? findUser.photo[0].res : "",
                            totalLikeCount: 0,
                            likeStatus: 0
                        }

                        final_response.push(response)

                    }

                }

            } else {

                const count = (user.LikeSession.participants_2)

                const findUser = await userModel.findOne({
                    _id: findSession.participants[0].participants_2
                })

                const response = {
                    _id: findUser._id,
                    userName: findUser.firstName,
                    userProfile: findUser.photo[0] ? findUser.photo[0].res : "",
                    totalLikeCount: count.length,
                    likeStatus: 1
                }

                final_response.push(response)
            }

            if (user.LikeSession.participants_1[0] == undefined) {

                if (findSession.participants[0].participants_1 != null) {

                    const findUser = await userModel.findOne({
                        _id: findSession.participants[0].participants_1
                    })

                    if (findUser == null) {

                        res.status(status.NOT_FOUND).json(
                            new APIResponse("User not Found", "false", 404, "0")
                        )

                    } else {

                        const response = {
                            _id: findUser._id,
                            userName: findUser.firstName,
                            userProfile: findUser.photo[0] ? findUser.photo[0].res : "",
                            totalLikeCount: 0,
                            likeStatus: 0
                        }

                        final_response.push(response)

                    }

                }

            } else {

                const count = (user.LikeSession.participants_1)
                console.log(count);

                const findUser = await userModel.findOne({
                    _id: findSession.participants[0].participants_1
                })

                if (findUser == null) {

                    res.status(status.NOT_FOUND).json(
                        new APIResponse("User not Found", "false", 404, "0")
                    )

                } else {

                    const response = {
                        _id: findUser._id,
                        userName: findUser.firstName,
                        userProfile: findUser.photo[0] ? findUser.photo[0].res : "",
                        totalLikeCount: count.length,
                        likeStatus: 1
                    }

                    final_response.push(response)

                }
            }

            res.status(status.OK).json(
                new APIResponse("total like session user with count", "true", 200, "1", final_response)
            )

        } else {
            res.status(status.NOT_FOUND).json(
                new APIResponse("session not found", "true", 404, "1",)
            )
        }

    } catch (error) {
        console.log("error", error);
        res.status(status.INTERNAL_SERVER_ERROR).json(
            new APIResponse("Something Went Wrong", "false", 500, "0", error.message)
        )
    }
}

exports.rejectOrAccept = async (req, res, next) => {
    try {
        const users = [];
        const findSession = await sessionModel.findOne({
            _id: req.params.session_id
        })

        if (findSession) {

            const findParticipant = await sessionComment.findOne({
                session_id: req.params.session_id
            })

            if (findParticipant) {

                // const pariticipant = [];
                // const p1 = findSession.participants[0].participants_1 == null ? "" : findSession.participants[0].participants_1
                // const p2 = findSession.participants[0].participants_2 == null ? "" : findSession.participants[0].participants_2
                // const p3 = findSession.participants[0].participants_3 == null ? "" : findSession.participants[0].participants_3
                // if (p1) {
                //     pariticipant.push(p1)
                // }
                // if (p2) {
                //     pariticipant.push(p2)
                // }
                // if (p3) {
                //     pariticipant.push(p3)
                // }

                // const joinParicipant = findParticipant.joinUser;

                // for (const data of joinParicipant){
                // for(const data1 of pariticipant){

                // if ((data.userId).toString() == (data1).toString()) {


                if (req.params.like_user_id == "null") {

                    const p1 = findSession.participants[0].participants_1 == null ? "" : findSession.participants[0].participants_1
                    const p2 = findSession.participants[0].participants_2 == null ? "" : findSession.participants[0].participants_2
                    const p3 = findSession.participants[0].participants_3 == null ? "" : findSession.participants[0].participants_3

                    if (p1) {
                        users.push(p1)
                    }
                    if (p2) {
                        users.push(p2)
                    }
                    if (p3) {
                        users.push(p3)
                    }


                    if (users[0] != undefined) {

                        for (const res of users) {
                            const rejectList = await rejectListModel.findOne({
                                session_id: req.params.session_id,
                                userId: req.params.user_id
                            })

                            await userModel.updateOne(
                                {
                                    _id: req.params.user_id
                                },
                                {
                                    $pull: {
                                        noBasket: {
                                            userId: mongoose.Types.ObjectId(res)
                                        }
                                    }
                                });

                            await userModel.updateOne(
                                {
                                    _id: req.params.user_id
                                },
                                {
                                    $pull: {
                                        yesBasket: {
                                            userId: mongoose.Types.ObjectId(res)
                                        }
                                    }
                                });

                            if (rejectList) {
                                await rejectListModel.updateOne({
                                    session_id: req.params.session_id,
                                    userId: req.params.user_id
                                }, {
                                    $push: {
                                        matchUserId: {
                                            userId: mongoose.Types.ObjectId(res)
                                        }
                                    }
                                })

                            } else {
                                const saveData = rejectListModel({
                                    session_id: req.params.session_id,
                                    userId: req.params.user_id,
                                    matchUserId: {
                                        userId: mongoose.Types.ObjectId(res)
                                    }
                                })

                                await saveData.save()
                            }
                        }


                        if (req.query.accessfrd == "true") {
                            const friendList = [];

                            const findUserInRequestModel = await requestsModel.findOne({
                                userId: req.params.user_id
                            })



                            console.log("findUserInRequestModel", findUserInRequestModel);
                            if (findUserInRequestModel) {
                                for (const user of findUserInRequestModel.RequestedEmails) {
                                    if (user.accepted == 2) {
                                        friendList.push(user.userId)
                                    }
                                }
                            }


                            console.log("friendList", friendList);
                            for (const notifyUser of friendList) {
                                const findUserInUserModel = await userModel.findOne({
                                    _id: notifyUser
                                })

                                const findUser = await userModel.findOne({
                                    _id: req.params.user_id,
                                })

                                if (findUserInUserModel.fcm_token) {
                                    const title = "No one Selected";
                                    const body = `${findUser.firstName} hasn't selected anyone in live video!`;

                                    const sendBy = (findUserInUserModel._id).toString();
                                    const registrationToken = findUserInUserModel.fcm_token
                                    Notification.sendPushNotificationFCM(
                                        registrationToken,
                                        title,
                                        body,
                                        sendBy,
                                        true
                                    );
                                }
                            }

                        }

                        if (req.query.access == "true") {

                            const sessionIds = await sessionModel.findOne({
                                _id: req.params.session_id
                            })

                            const paricipant = [];
                            const p1 = sessionIds.participants[0].participants_1 == null ? "" : sessionIds.participants[0].participants_1
                            const p2 = sessionIds.participants[0].participants_2 == null ? "" : sessionIds.participants[0].participants_2
                            const p3 = sessionIds.participants[0].participants_3 == null ? "" : sessionIds.participants[0].participants_3
                            if (p1) {
                                paricipant.push((sessionIds.participants[0].participants_1).toString())
                            } if (p2) {
                                paricipant.push((sessionIds.participants[0].participants_2).toString())
                            } if (p3) {
                                paricipant.push((sessionIds.participants[0].participants_3).toString())
                            }

                            for (const notifyUser of paricipant) {
                                const findUserInUserModel = await userModel.findOne({
                                    _id: notifyUser
                                })

                                const findUser = await userModel.findOne({
                                    _id: req.params.user_id,
                                })



                                if (findUserInUserModel.fcm_token) {
                                    const title = "No one Selected";
                                    const body = `${findUser.firstName} hasn't selected anyone in live video!`;

                                    const sendBy = (findUserInUserModel._id).toString();
                                    const registrationToken = findUserInUserModel.fcm_token
                                    Notification.sendPushNotificationFCM(
                                        registrationToken,
                                        title,
                                        body,
                                        sendBy,
                                        true
                                    );
                                }
                            }
                        }

                        res.status(status.OK).json(
                            new APIResponse("accepted rejected", "true", 200, "1",)
                        )

                    } else {
                        res.status(status.OK).json(
                            new APIResponse("not have any participant", "true", 200, "1",)
                        )
                    }
                } else if (req.params.like_user_id == "none") {
                    res.status(status.OK).json(
                        new APIResponse("not any selected", "true", 200, "1",)
                    )
                } else {


                    if ((req.params.like_user_id).toString() != findSession.participants[0].participants_1) {
                        users.push(findSession.participants[0].participants_1)
                    }
                    if ((req.params.like_user_id).toString() != findSession.participants[0].participants_2) {
                        users.push(findSession.participants[0].participants_2)
                    }
                    if ((req.params.like_user_id).toString() != findSession.participants[0].participants_3) {
                        users.push(findSession.participants[0].participants_3)
                    }



                    if (req.params.like_user_id) {

                        const suparMatchList = await superListModel.findOne({
                            session_id: req.params.session_id,
                            userId: req.params.user_id
                        })

                        const suparMatchListforLikeUser = await superListModel.findOne({
                            session_id: req.params.session_id,
                            userId: req.params.like_user_id
                        })


                        if (suparMatchList) {
                            await superListModel.updateOne({
                                session_id: req.params.session_id,
                                userId: req.params.user_id
                            }, {
                                $push: {
                                    matchUserId: {
                                        userId: req.params.like_user_id
                                    }
                                }
                            })

                        } else {
                            const saveData = superListModel({
                                session_id: req.params.session_id,
                                userId: req.params.user_id,
                                matchUserId: {
                                    userId: req.params.like_user_id
                                }
                            })

                            await saveData.save()
                        }

                        if (suparMatchListforLikeUser) {
                            await superListModel.updateOne({
                                session_id: req.params.session_id,
                                userId: req.params.like_user_id
                            }, {
                                $push: {
                                    matchUserId: {
                                        userId: req.params.user_id
                                    }
                                }
                            })

                        } else {
                            const saveData = superListModel({
                                session_id: req.params.session_id,
                                userId: req.params.like_user_id,
                                matchUserId: {
                                    userId: req.params.user_id
                                }
                            })

                            await saveData.save()
                        }

                        await userModel.updateOne(
                            {
                                _id: req.params.user_id
                            },
                            {
                                $pull: {
                                    noBasket: {
                                        userId: req.params.like_user_id
                                    }
                                }
                            });

                        await userModel.updateOne(
                            {
                                _id: req.params.user_id
                            },
                            {
                                $pull: {
                                    yesBasket: {
                                        userId: req.params.like_user_id
                                    }
                                }
                            });

                        await userModel.updateOne(
                            {
                                _id: req.params.like_user_id
                            },
                            {
                                $pull: {
                                    noBasket: {
                                        userId: req.params.user_id
                                    }
                                }
                            });

                        await userModel.updateOne(
                            {
                                _id: req.params.like_user_id
                            },
                            {
                                $pull: {
                                    yesBasket: {
                                        userId: req.params.user_id
                                    }
                                }
                            });

                        if (users[0] != undefined) {


                            for (const res of users) {
                                const rejectList = await rejectListModel.findOne({
                                    session_id: req.params.session_id,
                                    userId: req.params.user_id
                                })

                                await userModel.updateOne(
                                    {
                                        _id: req.params.user_id
                                    },
                                    {
                                        $pull: {
                                            noBasket: {
                                                userId: mongoose.Types.ObjectId(res)
                                            }
                                        }
                                    });

                                await userModel.updateOne(
                                    {
                                        _id: req.params.user_id
                                    },
                                    {
                                        $pull: {
                                            yesBasket: {
                                                userId: mongoose.Types.ObjectId(res)
                                            }
                                        }
                                    });

                                if (rejectList) {
                                    await rejectListModel.updateOne({
                                        session_id: req.params.session_id,
                                        userId: req.params.user_id
                                    }, {
                                        $push: {
                                            matchUserId: {
                                                userId: mongoose.Types.ObjectId(res)
                                            }
                                        }
                                    })

                                } else {
                                    const saveData = rejectListModel({
                                        session_id: req.params.session_id,
                                        userId: req.params.user_id,
                                        matchUserId: {
                                            userId: mongoose.Types.ObjectId(res)
                                        }
                                    })

                                    await saveData.save()
                                }
                            }

                        }

                        if (req.query.accessfrd == "true") {

                            console.log("gvfdverfdgergf");
                            const friendList = [];

                            const findUserInRequestModel = await requestsModel.findOne({
                                userId: req.params.user_id
                            })



                            if (findUserInRequestModel) {
                                for (const user of findUserInRequestModel.RequestedEmails) {
                                    if (user.accepted == 2) {
                                        friendList.push(user.userId)
                                    }
                                }
                            }


                            for (const notifyUser of friendList) {
                                const findUserInUserModel = await userModel.findOne({
                                    _id: notifyUser
                                })

                                const findUser = await userModel.findOne({
                                    _id: req.params.user_id,
                                })

                                const requesrUser = await userModel.findOne({
                                    _id: req.params.like_user_id
                                })
                                if (findUserInUserModel.fcm_token) {
                                    const title = "New Super Match";
                                    const body = `${findUser.firstName} and ${requesrUser.firstName} are now super match`;

                                    const sendBy = (findUserInUserModel._id).toString();
                                    const registrationToken = findUserInUserModel.fcm_token
                                    Notification.sendPushNotificationFCM(
                                        registrationToken,
                                        title,
                                        body,
                                        sendBy,
                                        true
                                    );
                                }
                            }

                        }

                        if (req.query.access == "true") {

                            console.log("11111");
                            const sessionIds = await sessionModel.findOne({
                                _id: req.params.session_id
                            })

                            const paricipant = [];
                            const p1 = sessionIds.participants[0].participants_1 == null ? "" : sessionIds.participants[0].participants_1
                            const p2 = sessionIds.participants[0].participants_2 == null ? "" : sessionIds.participants[0].participants_2
                            const p3 = sessionIds.participants[0].participants_3 == null ? "" : sessionIds.participants[0].participants_3
                            if (p1) {
                                paricipant.push((sessionIds.participants[0].participants_1).toString())
                            } if (p2) {
                                paricipant.push((sessionIds.participants[0].participants_2).toString())
                            } if (p3) {
                                paricipant.push((sessionIds.participants[0].participants_3).toString())
                            }


                            console.log("paricipant", paricipant);
                            for (const notifyUser of paricipant) {
                                const findUserInUserModel = await userModel.findOne({
                                    _id: notifyUser
                                })

                                const findUser = await userModel.findOne({
                                    _id: req.params.user_id,
                                })

                                const requesrUser = await userModel.findOne({
                                    _id: req.params.like_user_id
                                })

                                if (findUserInUserModel.fcm_token) {
                                    const title = "New Super Match";
                                    const body = `${findUser.firstName} and ${requesrUser.firstName} are now super match`;
                                    const sendBy = (findUserInUserModel._id).toString();
                                    const registrationToken = findUserInUserModel.fcm_token
                                    Notification.sendPushNotificationFCM(
                                        registrationToken,
                                        title,
                                        body,
                                        sendBy,
                                        true
                                    );
                                }
                            }
                        }


                        res.status(status.OK).json(
                            new APIResponse("selecte or rejected", "true", 200, "1",)
                        )

                    } else {
                        res.status(status.OK).json(
                            new APIResponse("not any selected", "true", 200, "1",)
                        )

                    }
                }


            } else {
                res.status(status.NOT_FOUND).json(
                    new APIResponse("session not live", "true", 404, "1",)
                )
            }

        } else {
            res.status(status.NOT_FOUND).json(
                new APIResponse("session not found", "true", 404, "1",)
            )
        }
    } catch (error) {
        console.log("error", error);
        res.status(status.INTERNAL_SERVER_ERROR).json(
            new APIResponse("Something Went Wrong", "false", 500, "0", error.message)
        )
    }
}


exports.rejectList = async (req, res, next) => {
    try {

        const findUser = await rejectListModel.find({
            userId: req.params.user_id
        });
        // console.log("findUser::", findUser);

        const final_response = [];
        const session_detail = [];
        const rej_user_detail = [];

        for (const data of findUser) {

            for (const data1 of data.matchUserId) {
                console.log("data1::", data1);

                const findUser = await userModel.findOne({
                    _id: data1.userId
                });
                // console.log("findUser-now::", findUser);

                const findRequestModel = await requestsModel.findOne({
                    userId: req.params.user_id
                });
                // console.log("==========================================");

                const findUsers = await userModel.findOne({
                    _id: data1.userId
                })

                if (findRequestModel) {

                    const findData = await requestsModel.findOne({
                        userId: req.params.user_id,
                        "RequestedEmails.userId": findUser._id
                    })

                    if (findData) {

                        for (const user of findRequestModel.RequestedEmails) {

                            if ((user.userId).toString() == (findUser._id).toString()) {

                                if (user.accepted == 2) {

                                    const findChatRoomId1 = await chatRoomModel.findOne({
                                        user1: findUser._id,
                                        user2: req.params.user_id
                                    })

                                    const findChatRoomId2 = await chatRoomModel.findOne({
                                        user1: req.params.user_id,
                                        user2: findUser._id
                                    })

                                    if (findChatRoomId1) {

                                        rej_user_detail.push({
                                            sessionId: data.session_id,
                                            accept_by: findUser.userId,
                                            accept_by_user_Profile: findUsers.photo[0] ? findUsers.photo[0].res : "",
                                            userId: findUser._id,
                                            userProfile: findUser.photo[0] ? findUser.photo[0].res : "",
                                            status: user.accepted,
                                            userName: findUser.firstName,
                                            room: findChatRoomId1._id
                                        })

                                    } else if (findChatRoomId2) {

                                        rej_user_detail.push({
                                            sessionId: data.session_id,
                                            accept_by: findUser.userId,
                                            accept_by_user_Profile: findUsers.photo[0] ? findUsers.photo[0].res : "",
                                            userId: findUser._id,
                                            userProfile: findUser.photo[0] ? findUser.photo[0].res : "",
                                            status: user.accepted,
                                            userName: findUser.firstName,
                                            room: findChatRoomId2._id
                                        })

                                    } else {

                                        rej_user_detail.push({
                                            sessionId: data.session_id,
                                            accept_by: findUser.userId,
                                            accept_by_user_Profile: findUsers.photo[0] ? findUsers.photo[0].res : "",
                                            userId: findUser._id,
                                            userProfile: findUser.photo[0] ? findUser.photo[0].res : "",
                                            status: user.accepted,
                                            userName: findUser.firstName,
                                            room: ""
                                        })

                                    }

                                } else {

                                    rej_user_detail.push({
                                        sessionId: data.session_id,
                                        accept_by: findUser.userId,
                                        accept_by_user_Profile: findUsers.photo[0] ? findUsers.photo[0].res : "",
                                        userId: findUser._id,
                                        userProfile: findUser.photo[0] ? findUser.photo[0].res : "",
                                        status: user.accepted,
                                        userName: findUser.firstName,
                                        room: ""
                                    })

                                }

                            }
                        }
                    } else {

                        rej_user_detail.push({
                            sessionId: data.session_id,
                            accept_by: findUser.userId,
                            accept_by_user_Profile: findUsers.photo[0] ? findUsers.photo[0].res : "",
                            userId: findUser._id,
                            userProfile: findUser.photo[0] ? findUser.photo[0].res : "",
                            status: 3,
                            userName: findUser.firstName,
                            room: ""
                        })

                    }
                } else {

                    rej_user_detail.push({
                        sessionId: data.session_id,
                        accept_by: findUser.userId,
                        accept_by_user_Profile: findUsers.photo[0] ? findUsers.photo[0].res : "",
                        userId: findUser._id,
                        userProfile: findUser.photo[0] ? findUser.photo[0].res : "",
                        status: 3,
                        userName: findUser.firstName,
                        room: ""
                    })

                }


            }
        }

        res.status(status.OK).json(
            new APIResponse("get reject list", "true", 200, "1", rej_user_detail)
        )

    } catch (error) {

        console.log("error:::---", error);
        res.status(status.INTERNAL_SERVER_ERROR).json(
            new APIResponse("Something Went Wrong", "false", 500, "0", error.message)
        )

    }
}


exports.suparMatchList = async (req, res, next) => {
    try {
        const findUser = await superListModel.find({
            userId: req.params.user_id
        })

        const sup_user_detail = [];
        for (const data of findUser) {
            console.log("data.matchUserId", data.matchUserId);
            for (const data1 of data.matchUserId) {
                const findUser = await userModel.findOne({
                    _id: data1.userId
                })
                const findRequestModel = await requestsModel.findOne({
                    userId: req.params.user_id
                })
                const findUsers = await userModel.findOne({
                    _id: data1.userId
                })
                if (findRequestModel) {

                    const findData = await requestsModel.findOne({
                        userId: req.params.user_id,
                        "RequestedEmails.userId": findUser._id
                    })

                    if (findData) {
                        for (const user of findRequestModel.RequestedEmails) {
                            console.log(user.userId);
                            console.log("dd", findUser._id);
                            if ((user.userId).toString() == (findUser._id).toString()) {
                                if (user.accepted == 2) {

                                    const findChatRoomId1 = await chatRoomModel.findOne({
                                        user1: findUser._id,
                                        user2: req.params.user_id
                                    })

                                    const findChatRoomId2 = await chatRoomModel.findOne({
                                        user1: req.params.user_id,
                                        user2: findUser._id
                                    })

                                    if (findChatRoomId1) {

                                        sup_user_detail.push({
                                            sessionId: data.session_id,
                                            accept_by: findUser.userId,
                                            accept_by_user_Profile: findUsers.photo[0] ? findUsers.photo[0].res : "",
                                            userId: findUser._id,
                                            userProfile: findUser.photo[0] ? findUser.photo[0].res : "",
                                            status: user.accepted,
                                            userName: findUser.firstName,
                                            room: findChatRoomId1._id
                                        })

                                    } else if (findChatRoomId2) {

                                        sup_user_detail.push({
                                            sessionId: data.session_id,
                                            accept_by: findUser.userId,
                                            accept_by_user_Profile: findUsers.photo[0] ? findUsers.photo[0].res : "",
                                            userId: findUser._id,
                                            userProfile: findUser.photo[0] ? findUser.photo[0].res : "",
                                            status: user.accepted,
                                            userName: findUser.firstName,
                                            room: findChatRoomId2._id
                                        })
                                    } else {
                                        sup_user_detail.push({
                                            sessionId: data.session_id,
                                            accept_by: findUser.userId,
                                            accept_by_user_Profile: findUsers.photo[0] ? findUsers.photo[0].res : "",
                                            userId: findUser._id,
                                            userProfile: findUser.photo[0] ? findUser.photo[0].res : "",
                                            status: user.accepted,
                                            userName: findUser.firstName,
                                            room: ""
                                        })
                                    }

                                } else {
                                    sup_user_detail.push({
                                        sessionId: data.session_id,
                                        accept_by: findUser.userId,
                                        accept_by_user_Profile: findUsers.photo[0] ? findUsers.photo[0].res : "",
                                        userId: findUser._id,
                                        userName: findUser.firstName,
                                        userProfile: findUser.photo[0] ? findUser.photo[0].res : "",
                                        status: user.accepted,
                                        room: ""
                                    })
                                }

                            }
                        }
                    } else {
                        sup_user_detail.push({
                            sessionId: data.session_id,
                            accept_by: findUser.userId,
                            accept_by_user_Profile: findUsers.photo[0] ? findUsers.photo[0].res : "",
                            userId: findUser._id,
                            userName: findUser.firstName,
                            userProfile: findUser.photo[0] ? findUser.photo[0].res : "",
                            status: 3,
                            room: ""
                        })
                    }
                } else {
                    sup_user_detail.push({
                        sessionId: data.session_id,
                        accept_by: findUser.userId,
                        accept_by_user_Profile: findUsers.photo[0] ? findUsers.photo[0].res : "",
                        userId: findUser._id,
                        userName: findUser.firstName,
                        userProfile: findUser.photo[0] ? findUser.photo[0].res : "",
                        status: 3,
                        room: ""
                    })
                }

            }



        }


        res.status(status.OK).json(
            new APIResponse("get accept list", "true", 200, "1", sup_user_detail)
        )
    } catch (error) {
        console.log("error", error);
        res.status(status.INTERNAL_SERVER_ERROR).json(
            new APIResponse("Something Went Wrong", "false", 500, "0", error.message)
        )
    }
}

exports.moveBasketInRejectList = async (req, res, next) => {
    try {
        if (req.query.status == 1) {


            await userModel.updateOne(
                {
                    _id: req.params.user_id
                },
                {
                    $pull: {
                        noBasket: {
                            userId: req.params.req_id
                        }
                    }
                });

            await rejectListModel.updateOne({
                session_id: req.params.session_id,
                userId: req.params.user_id
            }, {
                $pull: {
                    matchUserId: {
                        userId: req.params.req_id
                    }
                }
            })

            await userModel.updateOne(
                {
                    _id: req.params.user_id
                },
                {
                    $push: {
                        yesBasket: {
                            match: 0,
                            userId: req.params.req_id,
                            thumbUp: 0,
                            thumbDown: 0
                        }

                    }
                });
        } else {


            await userModel.updateOne(
                {
                    _id: req.params.user_id
                },
                {
                    $pull: {
                        yesBasket: {
                            userId: req.params.req_id
                        }
                    }
                });

            const suparMatchList = await rejectListModel.updateOne({
                session_id: req.params.session_id,
                userId: req.params.user_id
            }, {
                $pull: {
                    matchUserId: {
                        userId: req.params.req_id
                    }
                }
            })

            await userModel.updateOne(
                {
                    _id: req.params.user_id
                },
                {
                    $push: {
                        noBasket: {
                            match: 0,
                            userId: req.params.req_id,
                            thumbUp: 0,
                            thumbDown: 0
                        }

                    }
                });
        }

        res.status(status.NOT_FOUND).json(
            new APIResponse("move success", "true", 200, "1")
        )


    } catch (error) {
        console.log("error", error);
        res.status(status.INTERNAL_SERVER_ERROR).json(
            new APIResponse("Something Went Wrong", "false", 500, "0", error.message)
        )
    }
}
