const db = wx.cloud.database();

Page({
  data: {
    reminder: {}
  },

  onLoad(options) {
    const id = options.id;
    this.loadReminder(id);
  },

  loadReminder(id) {
    db.collection('reminders').doc(id).get().then(res => {
      this.setData({
        reminder: res.data
      });
    });
  },

  onEventInput(e) {
    const event = e.detail.value;
    this.setData({
      ['reminder.event']: event  // 使用展开运算符或这种方式来正确更新对象属性
    });
  },
   
  onTimeChange: function(e) {
    const selectedTime = e.detail.value;
    this.setData({
      ['reminder.time']: `${this.data.reminder.date} ${selectedTime}`  // 直接更新 reminder.time
    });
  },
   
  onDateChange: function(e) { 
    const selectedDate = e.detail.value; 
    this.setData({
      ['reminder.date']: selectedDate  // 直接更新 reminder.date
    });
  },

  updateCombinedDateTime: function(date, time1) {
    this.setData({
      time: `${date} ${time1}`
    });
  },
  updateReminder() {
    const { reminder } = this.data;
    if (!reminder.event || !reminder.time) {
      wx.showToast({
        title: '请填写完整信息',
        icon: 'none'
      });
      return;
    }
    db.collection('reminders').doc(reminder._id).update({
      data: {
        event: reminder.event,
        time: reminder.time
      }
    }).then(() => {
      wx.showToast({
        title: '更新成功',
        icon: 'success'
      });
      wx.navigateBack();
    });
  }
});



