const db = wx.cloud.database();
const app = getApp();

Page({
  data: {
    totalSignDays: 0,
    totalPoints: 0,
    hasSignedToday: false,
    currentDate: '',
    userId: '' // 添加 userId 到 data
  },

  onLoad() {
    // 获取当前日期
    const today = new Date().toISOString().split('T')[0];
    this.setData({
      currentDate: today
    });

    // 调用云函数获取 OpenID
    wx.cloud.callFunction({
      name: 'getOpenId',
      success: res => {
        const openId = res.result.userInfo.openId; // 获取 OpenID
        console.log(res.result);
        console.log(openId);
        // 使用 OpenID 查询用户的点数
        db.collection('user').where({ _openid: openId }).get().then(userRes => {
          if (userRes.data.length > 0) {
            const user = userRes.data[0];
            const points = user.point; // 获取用户的点数
            const userId = user._id; // 获取用户 ID

            // 保存用户 ID
            this.setData({
              userId: userId,
              totalPoints: points // 将用户的点数设置为 totalPoints
            });

            // 打印调试信息
            console.log('用户点数:', points);
            console.log('openid',openId);

            // 获取总签到天数，使用 openid 查询
            db.collection('sign').where({ _openid: openId }).get().then(signRes => {
              const totalDays = signRes.data.length;

              // 检查今天是否已签到
              const hasSignedToday = signRes.data.some(item => item.date === today);

              // 更新数据
              this.setData({
                totalSignDays: totalDays,
                hasSignedToday: hasSignedToday
              });

              // 打印调试信息
              console.log('总签到天数:', totalDays);
              console.log('今天是否已签到:', hasSignedToday);
            }).catch(err => {
              console.error('查询签到记录失败', err);
            });
          } else {
            console.log('未找到用户');
          }
        }).catch(err => {
          console.error('查询用户失败', err);
        });
      },
      fail: err => {
        console.error('调用云函数失败', err);
      }
    });
  },


  signIn() {
    const userId = this.data.userId; // 使用 data 中的 userId
    const today = this.data.currentDate;

    // 先检查今天是否已经签到
    if (this.data.hasSignedToday) {
      wx.showToast({
        title: '今天已经签到过了',
        icon: 'none'
      });
      return; // 如果已签到，则不执行签到
    }

    // 添加签到记录
    db.collection('sign').add({
      data: {
        _openid: app.globalData.openId, // 保存用户的 OpenID
        date: today,
      }
    }).then(() => {
      // 更新用户的点数
      db.collection('user').doc(userId).update({
        data: {
          point: db.command.inc(20) // 将点数增加 20
        }
      }).then(() => {
        wx.showModal({
          title: '签到成功！',
          content: '您已完成签到。',
          complete: (res) => {
            if (res.confirm) {
              this.setData({
                hasSignedToday: true // 更新状态为已签到
              });
              wx.navigateBack(); // 返回主界面
            }
          }
        });
      }).catch(err => {
        console.error('更新用户点数失败', err);
      });
    }).catch(err => {
      console.error('签到失败', err);
    });
  }
});











