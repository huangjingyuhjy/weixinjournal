// mall.js
const db = wx.cloud.database();
const app = getApp();

Page({
  data: {
    userPoints: 0,
    themes: []
  },

  onLoad: function () {
    this.getUserPoints();
    this.getThemes();
  },

  // 获取用户积分
  getUserPoints: function () {
    wx.cloud.callFunction({
      name: 'getOpenId',
      success: res => {
        const openId = res.result.userInfo.openId;
        // 假设用户积分保存在 'user' 集合中，使用 openid 查询
        db.collection('user').where({
          _openid: openId
        }).get().then(userRes => {
          if (userRes.data.length > 0) {
            const user = userRes.data[0];
            const points = user.point;
            this.setData({
              userPoints: points
            });
          }
        });
      },
      fail: err => {
        console.error(err);
      }
    });
  },

  // 获取主题信息
getThemes: function () {
  db.collection('theme').get().then(res => {
    console.log('获取到的主题信息:', res); // 输出获取到的完整响应
    if (res.data.length > 0) {
      this.setData({
        themes: res.data
      });
    } else {
      console.warn('主题集合为空，未获取到任何数据');
      this.setData({
        themes: [] // 确保 themes 为空数组
      });
    }
  }).catch(err => {
    console.error('获取主题信息失败:', err);
  });
},


  // 购买按钮点击事件
onBuy: function (e) {
  const index = e.currentTarget.dataset.index;
  const theme = this.data.themes[index];

  // 调用云函数获取 openId
  wx.cloud.callFunction({
    name: 'getOpenId',
    success: res => {
      const openId = res.result.userInfo.openId; // 假设你的云函数返回的结构是 { openId: '...' }
      console.log('openid:',openId);
      // 查询 themeHadBuy 集合，检查是否已购买
      db.collection('themeHadBuy').where({
        _openid: openId,
        name: theme.name,
        isBought: true
      }).get().then(queryRes => {
        if (queryRes.data.length > 0) {
          // 如果查询结果不为空，说明用户已购买
          wx.showToast({
            title: '您已购买',
            icon: 'none'
          });
          return; // 结束函数，不再进行后续操作
        }

        // 检查积分是否足够
        if (!theme.isBought && this.data.userPoints >= theme.pointsNeed) {
          wx.showToast({
            title: '购买成功！',
            icon: 'success'
          });

          // 更新总积分
          const newPoints = this.data.userPoints - theme.pointsNeed;

          // 更新 user 集合的 points
          db.collection('user').where({
            _openid: openId
          }).update({
            data: {
              point: newPoints
            }
          }).then(() => {
            this.setData({
              userPoints: newPoints
            });
          });

          // 更新主题状态
          const updatedTheme = { ...theme, isBought: true };
          this.setData({
            [`themes[${index}]`]: updatedTheme
          });

          // 更新 themeHadBuy 集合
          db.collection('themeHadBuy').add({
            data: {
             // _openid: openId,
              name: theme.name,
              rgb: theme.rgb,
              isChange: false,
              isBought: true
            }
          }).then(() => {
            console.log('主题购买记录更新成功');
          }).catch(err => {
            console.error(err);
          });

        } else if (!theme.isBought) {
          wx.showToast({
            title: '购买失败，余额不足',
            icon: 'none'
          });
        }
      }).catch(err => {
        console.error('查询购买记录失败:', err);
        wx.showToast({
          title: '查询购买记录失败',
          icon: 'none'
        });
      });
    },
    fail: err => {
      console.error('获取 openId 失败:', err);
      wx.showToast({
        title: '获取用户信息失败',
        icon: 'none'
      });
    }
  });
},



  // 更换按钮点击事件
onChange: function (e) {
  const index = e.currentTarget.dataset.index;
  const theme = this.data.themes[index];

  // 调用云函数获取 openId
  wx.cloud.callFunction({
    name: 'getOpenId',
    success: res => {
      const openId = res.result.userInfo.openId; // 假设你的云函数返回的结构是 { openId: '...' }

      // 查询 themeHadBuy 集合，检查是否已购买且是否可以更换
      db.collection('themeHadBuy').where({
        _openid: openId,
        name: theme.name
      }).get().then(queryRes => {
        if (queryRes.data.length === 0) {
          // 没有对应的记录，未购买
          wx.showToast({
            title: '更换失败，未购买。',
            icon: 'none'
          });
        } else {
          const record = queryRes.data[0]; // 获取第一个记录
          
          if (record.isBought && !record.isChange) {
            // 如果已购买且未更换
            wx.showToast({
              title: '更换成功！',
              icon: 'success'
            });

            // 更新主题状态
            const updatedTheme = { ...theme, isChange: true };
            this.setData({
              [`themes[${index}]`]: updatedTheme
            });

            // 更新 themeHadBuy 集合中的 isChange 状态
            db.collection('themeHadBuy').where({
              _openid: openId,
              name: theme.name
            }).update({
              data: {
                isChange: true
              }
            }).then(() => {
              console.log('当前主题更换记录更新成功');

              // 更新其他已购买的主题的 isChange 为 false
              db.collection('themeHadBuy').where({
                _openid: openId,
                isBought: true,
                name: db.command.neq(theme.name)  // 排除当前主题
              }).update({
                data: {
                  isChange: false
                }
              }).then(() => {
                console.log('其他已购买主题的 isChange 更新为 false');
              }).catch(err => {
                console.error('更新其他主题的 isChange 失败:', err);
              });

            }).catch(err => {
              console.error('更新当前主题的 isChange 失败:', err);
            });
          } else if (record.isBought && record.isChange) {
            // 如果已购买且已更换
            wx.showToast({
              title: '您已更换',
              icon: 'none'
            });
          }
        }
      }).catch(err => {
        console.error('查询购买记录失败:', err);
        wx.showToast({
          title: '查询购买记录失败',
          icon: 'none'
        });
      });
    },
    fail: err => {
      console.error('获取 openId 失败:', err);
      wx.showToast({
        title: '获取用户信息失败',
        icon: 'none'
      });
    }
  });
},
getyuan(){
  wx.cloud.callFunction({
    name: 'getOpenId',
    data: {},
    success: function (res) {
      const openid = res.result.userInfo.openId; // 获取 openid
       console.log(openid)
      // 查询 themeHadBuy 集合
      db.collection('themeHadBuy').where({
        _openid: openid, // 根据 openid 查询
        isChange: true // 只查找 isChange 为 true 的记录
      }).get({
        success: function (queryRes) {
          console.log(queryRes.data)
          if (queryRes.data.length > 0) {
            // 如果找到符合条件的记录，进行更新
          const request = queryRes.data[0];
          db.collection('themeHadBuy').doc(request._id).update({
            data: {
              isChange: false // 将 isChange 变为 false
            },
            success: function () {
              console.log('更新成功！');
            },
            fail: function (err) {
              console.error('更新失败:', err);
            }
          });
       
          } else {
            console.log('没有找到符合条件的数据。');
          }
        },
        fail: function (err) {
          console.error('查询失败:', err);
        }
      });
    },
    fail: function (err) {
      console.error('获取 openid 失败:', err);
    }
  });
}
})










