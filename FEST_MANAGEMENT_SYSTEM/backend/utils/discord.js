const axios = require('axios');

// Post event to Discord
const postToDiscord = async (webhookUrl, event) => {
  if (!webhookUrl) {
    console.log('No webhook URL provided, skipping Discord notification');
    return;
  }

  console.log(`Attempting to send Discord notification for event: ${event.eventName}`);
  console.log(`Webhook URL: ${webhookUrl.substring(0, 50)}...`);

  try {
    const embed = {
      title: `New Event: ${event.eventName}`,
      description: event.eventDescription,
      color: 5814783, // Blue color
      fields: [
        {
          name: 'Event Type',
          value: event.eventType,
          inline: true,
        },
        {
          name: 'Registration Fee',
          value: event.registrationFee ? `₹${event.registrationFee}` : 'Free',
          inline: true,
        },
        {
          name: 'Registration Deadline',
          value: new Date(event.registrationDeadline).toLocaleDateString(),
          inline: true,
        },
        {
          name: 'Event Date',
          value: new Date(event.eventStartDate).toLocaleDateString(),
          inline: true,
        },
      ],
      timestamp: new Date(),
    };

    const response = await axios.post(webhookUrl, {
      embeds: [embed],
    });

    console.log('✅ Discord notification sent successfully');
    console.log(`Response status: ${response.status}`);
  } catch (error) {
    console.error('❌ Error posting to Discord:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
};

module.exports = {
  postToDiscord,
};
