const ScheduleItem = require('../models/ScheduleItem');

const scheduleController = {

  // Adaugă un nou element în orar

  async createScheduleItem(req, res) {
    try {
      const { user_id, day_of_week, start_time, event_name, teacher_name, location } = req.body;

      if (!user_id || !day_of_week || !start_time || !event_name) {
        return res.status(400).json({ success: false, message: "Date incomplete." });
      }

      const newItem = await ScheduleItem.create({
        user_id, day_of_week, start_time, event_name,
        teacher_name: teacher_name || null,
        location: location || null
      });

      res.status(201).json({ success: true, message: "Adăugat!", item: newItem });
    } catch (error) {
      console.error("Eroare creare:", error);
      res.status(500).json({ success: false, message: "Eroare server." });
    }
  },


  // Obține orarul unui utilizator

  async getUserSchedule(req, res) {
    try {
      const { userId } = req.params;
      const schedule = await ScheduleItem.findAll({
        where: { user_id: userId },
        order: [ ['day_of_week', 'ASC'], ['start_time', 'ASC'] ]
      });
      res.json({ success: true, schedule: schedule });
    } catch (error) {
      console.error("Eroare citire:", error);
      res.status(500).json({ success: false, message: "Eroare server." });
    }
  },

 
  // DELETE: Șterge un element 
 
  async deleteScheduleItem(req, res) {
    try {
        const { itemId } = req.params; // Luăm ID-ul evenimentului din URL

        const item = await ScheduleItem.findByPk(itemId);
        if (!item) {
            return res.status(404).json({ success: false, message: "Evenimentul nu a fost găsit." });
        }

        await item.destroy();

        res.json({ success: true, message: "Șters cu succes." });
    } catch (error) {
        console.error("Eroare ștergere:", error);
        res.status(500).json({ success: false, message: "Eroare server." });
    }
  }
};

module.exports = scheduleController;