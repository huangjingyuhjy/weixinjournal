// pages/mine/mine.js
const db = wx.cloud.database(); // 获取数据库实例
Page({
  data: {
    avatarUrl:"/images/avatar.png",
    nickname:"",
    ishidden:true,
    getdeng:false,
    id:'',
    rgb:"",
    completedCount: 0, // 新增变量用于存储已完成事项的数量
    failedCount: 0 // 新增变量用于存储未完成事项的数量
  },
 //退出登录
 tuichu(){
  let userInfo = wx.getStorageSync('userinfo');
  // 检查用户信息是否存在且有效
  wx.redirectTo({
    url: '/pages/login/login', // 目标页面的路径
  });
  
  console.log("用户开始更新")
  if (userInfo && userInfo._id) {
      // 更新用户在线状态
      wx.cloud.database().collection('user').doc(userInfo._id).update({
      }).then(res => {
          console.log("用户退出登录状态更新结果", res);
          wx.removeStorageSync('userinfo'); // 清除本地存储的用户信息
      }).catch(err => {
          console.error("更新在线状态失败", err);
          wx.showToast({
              title: '更新状态失败，请稍后再试',
              icon: 'none'
          });
      });
  }
  this.setData({
    nickname:'',
    avatarUrl:'/images/avatar.png',
    getdeng:false
  })
},
lianxiget(){
  wx.navigateTo({
    url: '/pages/lianxi/lianxi',
  })
},
  adminget(){
    wx.navigateTo({
      url: '/pages/adminlogin/adminlogin',
    })
  },
  
// 跳转到商城
mallGet() {
  wx.navigateTo({
    url: '/pages/mall/mall', // 确保这里的路径与实际页面路径一致
  });
},
loadAndDrawPieChart() {
  // 使用 Promise.all 来并行执行两个数据库查询
  Promise.all([
    db.collection('reminders').where({ completed: true }).count(),
    db.collection('reminders').where({ failed: true }).count()
  ])
  .then(([completedRes, failedRes]) => {
    // 更新数据
    this.setData({
      completedCount: completedRes.total,
      failedCount: failedRes.total
    });
    
    // 绘制饼状图
    this.drawPieChart();
  })
  .catch(err => {
    console.error('Error querying database:', err);
  });
},

// 绘制饼状图的逻辑（从原函数中提取）
drawPieChart() {
  const ctx = wx.createCanvasContext('pieChart');
  const completedCount = this.data.completedCount;
  const failedCount = this.data.failedCount;
  const totalCount = completedCount + failedCount;
  
  if (totalCount === 0) {
    // 如果总数为0，则不绘制饼状图（可选）
    console.log('No data to display in pie chart.');
    return;
  }
  
  const radius = 59; // 饼状图的半径
  const centerX = 150; // 饼状图的中心点X坐标
  const centerY = 60; // 饼状图的中心点Y坐标
  const startAngle = -Math.PI / 2; // 起始角度，设置为-90度（从上往下开始绘制）
  
  // 计算已完成事项和未完成事项的角度范围
  const completedAngle = (completedCount / totalCount) * 2 * Math.PI;
  // 由于两个扇形加起来应该是一个完整的圆，所以不需要单独计算 failedAngle
  // 但为了保持与原始代码一致，我们可以这样写（尽管它是冗余的）：
  // const failedAngle = (failedCount / totalCount) * 2 * Math.PI;
  
  // 绘制已完成事项的扇形
  ctx.beginPath();
  ctx.moveTo(centerX, centerY);
  ctx.arc(centerX, centerY, radius, startAngle, startAngle + completedAngle);
  ctx.setFillStyle('#C7DEE7'); // 设置填充颜色为绿色
  ctx.fill();
  
  // 绘制未完成事项的扇形（从已完成事项的结束角度开始，到整个圆的结束角度）
  ctx.beginPath();
  ctx.moveTo(centerX, centerY);
  ctx.arc(centerX, centerY, radius, startAngle + completedAngle, startAngle + 2 * Math.PI);
  ctx.setFillStyle('#F6EAF0'); // 设置填充颜色为红色
  ctx.fill();
  
  // 为整个饼状图绘制黑色边框（可选）
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI); // 绘制整个圆
  ctx.setStrokeStyle('#000000'); // 设置边框颜色为黑色
  ctx.setLineWidth(1); // 设置边框宽度
  ctx.stroke(); // 绘制边框
  
  // 绘制完成
  ctx.draw();
},
  onShow: function () {
    // 获取用户的 openid
    this.getRgbValues();
    this.loadAndDrawPieChart();
    wx.cloud.callFunction({
      name: 'getOpenId', // 调用云函数获取 openid
      success: res => {
        console.log(res)
        const openid = res.result.userInfo.openId; // 获取 openid
        // 查询用户表
        db.collection('user').where({
          _openid: openid
        }).get().then(res => {
          if (res.data.length > 0) {
            const userInfo = res.data[0];
            this.setData({
              avatarUrl: userInfo.avatarUrl,
              nickname: userInfo.nickname
            });
          } else {
            console.log("openid在这儿",openid)
            console.log('用户信息未找到');
          }
        }).catch(err => {
          console.error('查询失败: ', err);
        });
      },
      fail: err => {
        console.error('获取 openid 失败: ', err);
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
  },
  signget(){
    wx.navigateTo({
      url: '/pages/sign/sign',
    })
  }
})