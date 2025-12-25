const db = wx.cloud.database();

Page({
  data: {
    event: '',
    time: ''
  },


  onEventInput(e) {
    this.setData({
      event: e.detail.value
    });
  },
  onDateChange: function(e) {
    const selectedDate = e.detail.value;
    this.setData({
      date: selectedDate
    });
    this.updateCombinedDateTime(selectedDate, this.data.time);
  },

  onTimeChange: function(e) {
    const selectedTime = e.detail.value;
    this.setData({
      time1: selectedTime
    });
    this.updateCombinedDateTime(this.data.date, selectedTime);
  },

  updateCombinedDateTime: function(date, time1) {
    this.setData({
      time: `${date} ${time1}`
    });
  },
  addReminder() {
    const { event, time, thing} = this.data;
    if (!event || !time) {
      wx.showToast({
        title: '请填写完整信息',
        icon: 'none'
      });
      return;
    }

    db.collection('reminders').add({
      data: {
        event: event,
        time: time,
        thing:thing,
        completed: false,
        failed: false,
        createdAt: new Date()
      }
    }).then(() => {
      wx.showToast({
        title: '添加成功',
        icon: 'success'
      });
      wx.navigateBack();
    });
  }
});


