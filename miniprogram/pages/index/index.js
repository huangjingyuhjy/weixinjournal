const db = wx.cloud.database();

Page({
  data: {
    reminders: [],
    getqian:false,
    rgb:'',
    reminders_com:[]
  },

  onLoad() {
    this.loadReminders();
  },
  onShow(){
   this.getTodaySignData();
   this.loadReminders();
   this.updateFailedReminders();
   this.getRgbValues();
   this. loadReminder_com();
  },
   //此处是签到处理
   getTodaySignData: function() {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0]; // 获取今天的日期字符串，格式为 YYYY-MM-DD

    // 从 sign 集合中获取 date 等于今天的文档
    db.collection('sign')
      .where({
        date: todayStr // 使用等于条件
      })
      .get()
      .then(res => {
        if (res.data.length > 0) {
          // 有符合条件的数据
          this.setData({
           getqian:true
          });
        } else {
          // 没有符合条件的数据
          this.setData({
            getqian:false,
          });
        }
      })
      .catch(err => {
        console.error('获取数据失败:', err);
        this.setData({
          message: '数据获取失败，请稍后重试。'
        });
      });
  },
  async updateFailedReminders() {
    try {
      const currentTime = new Date(); // 获取当前时间
      const reminders = await db.collection('reminders')
        .where({
          completed: false,
          failed: false
        })
        .get();
      const updatePromises = reminders.data.map(reminder => {
        const reminderTime = new Date(reminder.time); // 将字符串转换为 Date 对象
        if (reminderTime < currentTime) { // 比较时间
          return db.collection('reminders').doc(reminder._id).update({
            data: {
              failed: true // 更新 failed 字段为 true
            }
          });
        }
        return Promise.resolve(); // 如果没有更新，则返回已解决的 Promise
      }).filter(promise => promise !== undefined); // 过滤掉未更新的 Promise
        
      await Promise.all(updatePromises); // 等待所有更新完成
      this.loadReminders();
    } catch (error) {
      wx.showToast({
        title: '更新失败',
        icon: 'none'
      });
      console.error('更新失败:', error);
    }
  },
  loadReminders() {
    db.collection('reminders').where({
       completed:false,
       failed:false
    }).get().then(res => {
      this.setData({
        reminders: res.data
      });
    });
  },
  loadReminder_com() {
   // 查询 reminders 集合
   db.collection('reminders').where({ completed: true }).get()
   .then(res1 => {
     // 处理第一个查询的结果
     const completedReminders = res1.data;
 
     return db.collection('reminders').where({ failed: true }).get().then(res2 => {
       // 处理第二个查询的结果
       const failedReminders = res2.data;
 
       // 合并两个查询的结果
       const reminderss = completedReminders.concat(failedReminders);
 
       if (reminderss.length === 0) {
           console.log("未有完成或打卡失败的日志");
       } else {
           this.setData({
               reminders_com: reminderss
           });
           console.log("输出在这儿", reminderss);
       }
     });
   })
   .catch(err => {
     console.error('查询失败:', err);
   }); 


  },
  goToSignIn() {
    wx.navigateTo({
      url: '/pages/sign/sign' // 假设签到页面的路径是 /pages/sign/sign
    });
  },

  goToAdd() {
    wx.navigateTo({
      url: '/pages/add/add'
    });
  },

  editReminder(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/edit/edit?id=${id}`
    });
  },

  deleteReminder(e) {
    const id = e.currentTarget.dataset.id;
    db.collection('reminders').doc(id).remove().then(() => {
      wx.showToast({
        title: '删除成功',
        icon: 'success'
      });
      this.loadReminders();
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
  completeReminder(e) {
    const id = e.currentTarget.dataset.id;
    db.collection('reminders').doc(id).update({
      data: {
        completed: true
      }
    }).then(() => {
      wx.showToast({
        title: '打卡完成',
        icon: 'success'
      });
      //积分增加
      wx.cloud.callFunction({
        name: 'getOpenId',
        success: res => {
          const openid = res.result.userInfo.openId; // 获取 openid
    
          // 查询 user 表
          db.collection('user').where({
            _openid: openid // 根据 _openid 查询
          }).get({
            success: queryRes => {
              console.log(queryRes.data);
              if (queryRes.data.length > 0) {
                // 如果找到符合条件的记录，进行更新
                const user = queryRes.data[0]; // 获取第一条用户记录
                const newPoints = user.point + 20; // 计算新的点数
    
                // 更新用户的点数
                db.collection('user').doc(user._id).update({
                  data: {
                    point: newPoints // 更新点数
                  },
                  success: () => {
                    console.log('用户点数更新成功！');
                  },
                  fail: err => {
                    console.error('点数更新失败:', err);
                  }
                });
              } else {
                console.log('没有找到匹配的用户记录。');
              }
            },
            fail: err => {
              console.error('查询用户失败:', err);
            }
          });
        },
        fail: err => {
          console.error('获取 openid 失败:', err);
        }
      });
      this.loadReminders();
    });
  },

  failReminder(e) {
    const id = e.currentTarget.dataset.id;
    db.collection('reminders').doc(id).update({
      data: {
        failed: true
      }
    }).then(() => {
      wx.showToast({
        title: '打卡失败',
        icon: 'success'
      });
      this.loadReminders();
    });
  }
});

