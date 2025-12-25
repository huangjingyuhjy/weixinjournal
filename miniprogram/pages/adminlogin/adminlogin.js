// pages/recharge/recharge.js
Page({
  data: {
    currentPoints: 0, // 当前积分
    selectedId: null, // 选中的充值选项ID
    customAmount: '', // 自定义金额
    rechargeOptions: [
      { id: 1, points: 100, price: 10 },
      { id: 2, points: 200, price: 20 },
      { id: 3, points: 500, price: 50 },
      { id: 4, points: 1000, price: 100 }
    ],
    loading: false // 加载状态
  },
  
  onLoad: function() {
    // 页面加载时获取用户当前积分
    this.getUserPointsFromCloud();
  },
  
  // 从云数据库获取用户积分
  getUserPointsFromCloud: function() {
    this.setData({ loading: true });
    
    const db = wx.cloud.database();
    const that = this;
    
    // 获取当前用户的openid
    wx.cloud.callFunction({
      name: 'getOpenId',
      success: res => {
        const openid = res.result.openid;
        
        // 查询user集合中该用户的积分
        db.collection('user').where({
          _openid: openid
        }).get({
          success: function(res) {
            if (res.data.length > 0) {
              // 用户记录存在，获取point字段
              that.setData({
                currentPoints: res.data[0].point || 0,
                loading: false
              });
            } else {
              // 用户记录不存在，可以初始化
              that.initUserRecord(openid);
            }
          },
          fail: function(err) {
            console.error('获取积分失败:', err);
            wx.showToast({
              title: '获取积分失败',
              icon: 'none'
            });
            that.setData({ loading: false });
          }
        });
      },
      fail: err => {
        console.error('获取openid失败:', err);
        wx.showToast({
          title: '获取用户信息失败',
          icon: 'none'
        });
        that.setData({ loading: false });
      }
    });
  },
  
  // 初始化用户记录
  initUserRecord: function(openid) {
    const db = wx.cloud.database();
    const that = this;
    
    db.collection('user').add({
      data: {
        _openid: openid,
        point: 0, // 初始积分为0
        createdAt: db.serverDate() // 服务器时间
      },
      success: function(res) {
        that.setData({
          currentPoints: 0,
          loading: false
        });
      },
      fail: function(err) {
        console.error('初始化用户记录失败:', err);
        wx.showToast({
          title: '初始化用户记录失败',
          icon: 'none'
        });
        that.setData({ loading: false });
      }
    });
  },
  
  // 选择充值选项
  selectOption: function(e) {
    const id = e.currentTarget.dataset.id;
    this.setData({
      selectedId: id,
      customAmount: '' // 选择固定选项时清空自定义金额
    });
  },
  
  // 输入自定义金额
  inputCustomAmount: function(e) {
    this.setData({
      customAmount: e.detail.value,
      selectedId: null // 选择自定义金额时清空固定选项
    });
  },
  
  // 处理充值
  handleRecharge: function() {
    if (this.data.loading) return;
    
    let amount = 0;
    let points = 0;
    
    if (this.data.selectedId) {
      // 选择固定选项
      const option = this.data.rechargeOptions.find(item => item.id === this.data.selectedId);
      amount = option.price;
      points = option.points;
    } else if (this.data.customAmount) {
      // 自定义金额
      amount = parseFloat(this.data.customAmount);
      if (isNaN(amount) ){
        wx.showToast({
          title: '请输入有效金额',
          icon: 'none'
        });
        return;
      }
      if (amount <= 0) {
        wx.showToast({
          title: '充值金额必须大于0',
          icon: 'none'
        });
        return;
      }
      // 自定义金额与积分的换算比例，根据业务需求调整
      points = Math.floor(amount * 10);
    } else {
      wx.showToast({
        title: '请选择充值选项或输入金额',
        icon: 'none'
      });
      return;
    }
    
    // 调用微信支付
    this.requestCloudPayment(amount, points);
  },
  
  // 请求云函数进行支付
  requestCloudPayment: function(amount, points) {
    this.setData({ loading: true });
    
    wx.cloud.callFunction({
      name: 'createRechargeOrder', // 你的云函数名称
      data: {
        amount: amount,
        points: points
      },
      success: res => {
        const paymentParams = res.result;
        
        // 调用微信支付
        wx.requestPayment({
          timeStamp: paymentParams.timeStamp,
          nonceStr: paymentParams.nonceStr,
          package: paymentParams.package,
          signType: paymentParams.signType,
          paySign: paymentParams.paySign,
          success: res => {
            // 支付成功
            wx.showToast({
              title: '充值成功',
              icon: 'success',
              duration: 2000,
              complete: () => {
                // 支付成功后重新获取积分
                this.getUserPointsFromCloud();
              }
            });
          },
          fail: err => {
            console.error('支付失败:', err);
            wx.showToast({
              title: '支付取消或失败',
              icon: 'none'
            });
            this.setData({ loading: false });
          }
        });
      },
      fail: err => {
        console.error('创建订单失败:', err);
        wx.showToast({
          title: '创建订单失败',
          icon: 'none'
        });
        this.setData({ loading: false });
      }
    });
  }
});