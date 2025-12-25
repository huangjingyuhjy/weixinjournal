// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV }) // 使用当前云环境

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()

  return {
    event,
    openid: wxContext.OPENID,
    appid: wxContext.APPID,
    unionid: wxContext.UNIONID,
  }
}// getUserInfo/index.js
const cloud = require('wx-server-sdk');

cloud.init();

const db = cloud.database();
const userCollection = db.collection('user');

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();

  try {
    // 获取当前用户的 openId
    const openId = wxContext.OPENID;

    // 查询用户信息
    const userInfo = await userCollection.where({
      _openid: openId
    }).get();

    // 如果找到了用户信息，返回第一个用户的积分
    if (userInfo.data.length > 0) {
      return {
        success: true,
        data: userInfo.data[0] // 返回用户信息
      };
    } else {
      return {
        success: false,
        message: '用户未找到'
      };
    }
  } catch (error) {
    return {
      success: false,
      message: error.message
    };
  }
};