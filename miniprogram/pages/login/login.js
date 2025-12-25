// pages/login/login.js
const db = wx.cloud.database(); // 获取数据库实例
Page({
  data: {
    avatarUrl:"/images/avatar.png",
    nickname:"",
    ishidden:true,
    getdeng:false,
    id:'',
    rgb:""
  },
  getAvatar(e){
    //获取用户头像路径
    console.log(e)
    this.setData({
      avatarUrl:e.detail.avatarUrl,
    })
  },
  getName(e) {
    console.log(e);
    this.setData({
        nickname: e.detail.value,
    });
},

onShow() {
  this.getRgbValues();
},
 
  // 弹窗登陆部分
  potNo(){
    this.setData({
      ishidden:true
    })
  },
  goLogin(){
    this.setData({
      ishidden:false,
      nickname:'',
      avatarUrl:'/images/avatar.png',
    })
  },
  getCurrentLocalTime: function() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0'); // 月份从0开始
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    
    // 格式化为 "YYYY-MM-DD HH:MM:SS"
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  },
  potYes() {
    
    wx.cloud.callFunction({
        name: 'getOpenId', // 云函数名称
        data: {},
        success: function(res) {
            console.log('获取到的 openid:', res.result.userInfo.openId);
            const openId = res.result.userInfo.openId; // 将 openId 存储在一个变量中
            this.setData({
                id: openId
            });
            let avatarUrl = this.data.avatarUrl;
            console.log("头像链接", avatarUrl);
            let nickname = this.data.nickname;

            // 检查头像和昵称
            if (!avatarUrl) {
                wx.showToast({
                    icon: 'error',
                    title: '头像未获取',
                });
                return;
            } 
            if (!nickname) {
                wx.showToast({
                    icon: 'error',
                    title: '请输入昵称',
                });
                return;
            }

            // 在这里进行数据库查询
            db.collection('user').where({
                _openid: openId // 使用获取到的 openId
            }).get().then(res => {
                if (res.data && res.data.length > 0) {
                    let item = res.data[0];
                    wx.cloud.uploadFile({
                        cloudPath: nickname + '.png',
                        filePath: avatarUrl,
                    }).then(res => {
                        console.log(res.fileID);
                        let userInfo = {};
                        userInfo.avatarUrl = res.fileID;
                        userInfo.nickname = nickname;
                        userInfo.lastLoginTime = this.getCurrentLocalTime(); // 记录当前时间为上次登录时间
                        wx.cloud.database().collection('user').doc(item._id).update({
                            data: userInfo
                        }).then(res => {
                            console.log("更新用户的结果", res);
                            wx.switchTab({
                              url: '/pages/index/index' // 目标 tabBar 页面的路径
                            });
                            this.setData({
                                ishidden: true,
                                getdeng: true,
                                userInfo: userInfo
                            });
                        });
                    });
                    return;
                } else {
                    // 未注册继续往下走
                    wx.cloud.uploadFile({
                        cloudPath: nickname + '.png',
                        filePath: avatarUrl,
                    }).then(res => {
                        console.log(res.fileID);
                        let userInfo = {};
                        userInfo.avatarUrl = res.fileID;
                        userInfo.nickname = nickname;
                        userInfo.lastLoginTime = this.getCurrentLocalTime(); // 记录当前时间为上次登录时间
                        userInfo.point = 0;//第一此登录就初始化为0
                        wx.setStorageSync('userinfo', userInfo);

                        wx.cloud.database().collection('user').add({
                            data: userInfo
                        }).then(res => {
                            console.log("注册用户的结果", res);
                            
                            this.setData({
                                ishidden: true,
                                getdeng: true,
                                userInfo: userInfo
                            });
                            wx.switchTab({
                                url: '/pages/index/index' // 跳转到首页
                            });
                        });
                    });
                }
            });
        }.bind(this), // 确保 this 指向正确
        fail: err => {
            console.error('调用云函数失败:', err);
        }
    });
},
getRgbValues: function() {
  // 调用云函数获取 openid
  wx.cloud.callFunction({
    name: 'getOpenId',
    success: res => {
      const openid = res.result.userInfo.openId; // 获取 openid

      // 从 themeHadBuy 集合中获取 isChange 为 true 且 openid 匹配的文档
      db.collection('themeHadBuy')
        .where({
          isChange: true,
          _openid: openid // 添加 openid 条件
        })
        .get()
        .then(res => {
          if (res.data.length > 0) {
            // 提取 rgb 属性
            const rgbValues = res.data[0].rgb;
            console.log("看这儿", res.data);
            
            // 更新数据到页面
            this.setData({
              rgb: rgbValues
            });
            console.log(rgbValues); // 确保这里是 rgbValues
          } else {
            console.log('没有找到符合条件的数据。');
            this.setData({
              rgb: "bisque" // 或者设置为默认值
            });
          }
        })
        .catch(err => {
          console.error('获取数据失败:', err);
        });
    },
    fail: err => {
      console.error('获取 openid 失败:', err);
    }
  });
}
})