const Utils = require("./utils/utils");
const utils = new Utils();
const fs = require("fs");
const formData = require("form-data");
const Mailgun = require("mailgun.js");
const com = require("commander");
const inquirer = require("inquirer");
const axios = require("axios");
const delay = (delayInms) => {
    return new Promise((resolve) => setTimeout(resolve, delayInms));
};

function formatPhoneNumber(number) {
    number = String(number);
    // Remove any non-numeric characters
    let formattedNumber = number.replace(/\D/g, '');

    // If it doesn't start with '5', remove characters until it does
    if (!formattedNumber.startsWith('5')) {
        // Remove any leading numbers until '5' is the first character
        formattedNumber = formattedNumber.replace(/^[^5]*/, '');
    }

    // Check if the length of the formatted number is 10
    if (formattedNumber.length === 10) {
        return formattedNumber;
    } else {
        // If not 10 characters, return null to prevent sending
        return null;
    }
}

const puppeteer = require('puppeteer');
com.command("whatsapp-puppeteer")
  .description("Send WhatsApp message to customers using Puppeteer")
  .action(async () => {
    inquirer
      .prompt([
        {
          type: "list",
          name: "wp_excel",
          message: "Whatsapp Excel Dosyası:",
          choices: () => {
            const files = fs.readdirSync("excel");
            return files;
          },
        }
      ])
      .then(async (answers) => {
        try {

          const excel_data = utils.xslxToJson(`excel/${answers.wp_excel}`);
          if (!excel_data) {
            console.log("Excel dosyası bulunamadı!");
            return;
          }

          // Initialize Puppeteer and open WhatsApp Web
          const browser = await puppeteer.launch({ headless: false , args: ['--start-fullscreen'] });
          
          const page = await browser.newPage();
          await page.setViewport({ width: 1920, height: 1080 });
          await page.goto("https://web.whatsapp.com");

          console.log("Please scan the QR code in WhatsApp Web to continue...");
          await page.waitForSelector('div[title="Chats"]', { timeout: 60000 })
          .then(() => console.log("WhatsApp Web opened successfully."))
          .catch(() => console.log("Login timed out. Please try again."));
          
          console.log("WhatsApp Web opened successfully.");
          
          // Loop through each contact in the Excel file and send a message
          for (const ex_data of excel_data) {
            try {
                
          
            const number = formatPhoneNumber(ex_data.number);
            if(!number){
                console.log("\x1b[31mGecersiz numara: ", ex_data.number, "\x1b[0m");
                continue;
            }
            // Search for the contact
            await page.waitForSelector('div[contenteditable="true"][role="textbox"]', { timeout: 2000 });
            
            await page.click('div[contenteditable="true"][role="textbox"]');
            await page.keyboard.type(number);
            await delay(2000); // Wait for search results

                // Check if "No chats, contacts or messages found" message appears
            const noChatsMessage = await page.$('#pane-side > div > div > span');  // The selector you provided
            if (noChatsMessage) {
                const messageText = await page.evaluate(el => el.textContent, noChatsMessage);
                if (messageText === 'No chats, contacts or messages found') {
                // Get the length of the number typed and delete it character by character
                const numberLength = number.length;
                for (let i = 0; i < numberLength; i++) {
                    await page.keyboard.press('Backspace');  // Press 'Backspace' multiple times to clear the input
                }
                    continue;                                 
                }
            }
            // Click on the first contact
            await page.keyboard.press('Enter');
            await delay(2000);

            // Prepare the message with bold header and spacing between parts
            const header = ex_data.header ? `*${ex_data.header}*` : '';
            const body = ex_data.body || '';
            const footer = ex_data.footer || '';
            const message = `${header}\n\n${body}\n\n${footer}`;

            // Focus on the message input field and type the message
            await page.waitForSelector('#main > footer > div.x1n2onr6.xhtitgo.x9f619.x78zum5.x1q0g3np.xuk3077.x193iq5w.x122xwht.x1bmpntp.xs9asl8.x1swvt13.x1pi30zi.xnpuxes.copyable-area > div > span > div > div._ak1r > div.x9f619.x12lumcd.x1qrby5j.xeuugli.xisnujt.x6prxxf.x1fcty0u.x1fc57z9.xe7vic5.x1716072.xgde2yp.x89wmna.xbjl0o0.x13fuv20.xu3j5b3.x1q0q8m5.x26u7qi.x178xt8z.xm81vs4.xso031l.xy80clv.x1lq5wgf.xgqcy7u.x30kzoy.x9jhf4c.x1a2a7pz.x13w7htt.x78zum5.x96k8nx.xdvlbce.x1ye3gou.xn6708d.x1ok221b.xu06os2.x1i64zmx.x1emribx > div > div.x1hx0egp.x6ikm8r.x1odjw0f.x1k6rcq7.x6prxxf > p', { timeout: 5000 });

            // Type the message line by line, using Shift + Enter for new lines
            for (const line of message.split('\n')) {
                await page.type('#main > footer > div.x1n2onr6.xhtitgo.x9f619.x78zum5.x1q0g3np.xuk3077.x193iq5w.x122xwht.x1bmpntp.xs9asl8.x1swvt13.x1pi30zi.xnpuxes.copyable-area > div > span > div > div._ak1r > div.x9f619.x12lumcd.x1qrby5j.xeuugli.xisnujt.x6prxxf.x1fcty0u.x1fc57z9.xe7vic5.x1716072.xgde2yp.x89wmna.xbjl0o0.x13fuv20.xu3j5b3.x1q0q8m5.x26u7qi.x178xt8z.xm81vs4.xso031l.xy80clv.x1lq5wgf.xgqcy7u.x30kzoy.x9jhf4c.x1a2a7pz.x13w7htt.x78zum5.x96k8nx.xdvlbce.x1ye3gou.xn6708d.x1ok221b.xu06os2.x1i64zmx.x1emribx > div > div.x1hx0egp.x6ikm8r.x1odjw0f.x1k6rcq7.x6prxxf > p', line);
                await page.keyboard.down('Shift');
                await page.keyboard.press('Enter');
                await page.keyboard.up('Shift');
            }

            // Send the message by pressing Enter
            await page.keyboard.press('Enter'); // Send the message
            console.log(`Message sent to ${number}`);


            
            // Click on the survey button (to start interacting with the survey)
            await page.waitForSelector('#main > footer > div.x1n2onr6.xhtitgo.x9f619.x78zum5.x1q0g3np.xuk3077.x193iq5w.x122xwht.x1bmpntp.xs9asl8.x1swvt13.x1pi30zi.xnpuxes.copyable-area > div > span > div > div.x9f619.x78zum5.x6s0dn4.xl56j7k.x1ofbdpd._ak1m > div.x78zum5.x6s0dn4 > div > div > div > span');
            await page.click('#main > footer > div.x1n2onr6.xhtitgo.x9f619.x78zum5.x1q0g3np.xuk3077.x193iq5w.x122xwht.x1bmpntp.xs9asl8.x1swvt13.x1pi30zi.xnpuxes.copyable-area > div > span > div > div.x9f619.x78zum5.x6s0dn4.xl56j7k.x1ofbdpd._ak1m > div.x78zum5.x6s0dn4 > div > div > div > span'); // Click to open survey

            await delay(1000); // Wait for survey to load

            // Click on the specific option (for example, the fifth one in the list)
            await page.click('#main > footer > div.x1n2onr6.xhtitgo.x9f619.x78zum5.x1q0g3np.xuk3077.x193iq5w.x122xwht.x1bmpntp.xs9asl8.x1swvt13.x1pi30zi.xnpuxes.copyable-area > div > span > div > div.x9f619.x78zum5.x6s0dn4.xl56j7k.x1ofbdpd._ak1m > div.x78zum5.x6s0dn4 > div > span > div > ul > div > div:nth-child(5) > li > div');

            await delay(300); // Wait for the selection to be made

            // Now type the message "Bu mesajı faydalı buldunuz mu?"
            await page.type('#app > div > span:nth-child(3) > div > div > div > div > div > div > div > div > div.x1n2onr6.xyw6214.x78zum5.x1r8uery.x1iyjqo2.xdt5ytf.x6ikm8r.x1odjw0f.x1hc1fzr.x1tkvqr7 > div > div._alcf._alcm > div._alc_._ald3 > div._aldd > div > div > p', 'Bu mesajı faydalı buldunuz mu?');
            await delay(300);

            // Wait for the element to appear and click on it before typing
            await page.waitForSelector('#app > div > span:nth-child(3) > div > div > div > div > div > div > div > div > div.x1n2onr6.xyw6214.x78zum5.x1r8uery.x1iyjqo2.xdt5ytf.x6ikm8r.x1odjw0f.x1hc1fzr.x1tkvqr7 > div > div.x1odjw0f.xr9ek0c.xyorhqc > div > div:nth-child(1) > div > div > div > div > div._alc_._ald3 > div._aldd > div > div > p');
            await page.click('#app > div > span:nth-child(3) > div > div > div > div > div > div > div > div > div.x1n2onr6.xyw6214.x78zum5.x1r8uery.x1iyjqo2.xdt5ytf.x6ikm8r.x1odjw0f.x1hc1fzr.x1tkvqr7 > div > div.x1odjw0f.xr9ek0c.xyorhqc > div > div:nth-child(1) > div > div > div > div > div._alc_._ald3 > div._aldd > div > div > p');

            // Type "Broşür İstiyorum"
            await page.type('#app > div > span:nth-child(3) > div > div > div > div > div > div > div > div > div.x1n2onr6.xyw6214.x78zum5.x1r8uery.x1iyjqo2.xdt5ytf.x6ikm8r.x1odjw0f.x1hc1fzr.x1tkvqr7 > div > div.x1odjw0f.xr9ek0c.xyorhqc > div > div:nth-child(1) > div > div > div > div > div._alc_._ald3 > div._aldd > div > div > p', 'Broşür İstiyorum');

            // Wait and click on the second option
            await page.waitForSelector('#app > div > span:nth-child(3) > div > div > div > div > div > div > div > div > div.x1n2onr6.xyw6214.x78zum5.x1r8uery.x1iyjqo2.xdt5ytf.x6ikm8r.x1odjw0f.x1hc1fzr.x1tkvqr7 > div > div.x1odjw0f.xr9ek0c.xyorhqc > div > div:nth-child(2) > div > div > div > div > div._alc_._ald3 > div > div > div > p');
            await page.click('#app > div > span:nth-child(3) > div > div > div > div > div > div > div > div > div.x1n2onr6.xyw6214.x78zum5.x1r8uery.x1iyjqo2.xdt5ytf.x6ikm8r.x1odjw0f.x1hc1fzr.x1tkvqr7 > div > div.x1odjw0f.xr9ek0c.xyorhqc > div > div:nth-child(2) > div > div > div > div > div._alc_._ald3 > div > div > div > p');

            // Type "Fiyat İstiyorum"
            await page.type('#app > div > span:nth-child(3) > div > div > div > div > div > div > div > div > div.x1n2onr6.xyw6214.x78zum5.x1r8uery.x1iyjqo2.xdt5ytf.x6ikm8r.x1odjw0f.x1hc1fzr.x1tkvqr7 > div > div.x1odjw0f.xr9ek0c.xyorhqc > div > div:nth-child(2) > div > div > div > div > div._alc_._ald3 > div > div > div > p', 'Fiyat İstiyorum');

            // Wait and click on the third option
            await page.waitForSelector('#app > div > span:nth-child(3) > div > div > div > div > div > div > div > div > div.x1n2onr6.xyw6214.x78zum5.x1r8uery.x1iyjqo2.xdt5ytf.x6ikm8r.x1odjw0f.x1hc1fzr.x1tkvqr7 > div > div.x1odjw0f.xr9ek0c.xyorhqc > div > div:nth-child(3) > div > div > div > div > div._alc_._ald3 > div._aldd > div > div > p');
            await page.click('#app > div > span:nth-child(3) > div > div > div > div > div > div > div > div > div.x1n2onr6.xyw6214.x78zum5.x1r8uery.x1iyjqo2.xdt5ytf.x6ikm8r.x1odjw0f.x1hc1fzr.x1tkvqr7 > div > div.x1odjw0f.xr9ek0c.xyorhqc > div > div:nth-child(3) > div > div > div > div > div._alc_._ald3 > div._aldd > div > div > p');

            // Type "İstemiyorum"
            await page.type('#app > div > span:nth-child(3) > div > div > div > div > div > div > div > div > div.x1n2onr6.xyw6214.x78zum5.x1r8uery.x1iyjqo2.xdt5ytf.x6ikm8r.x1odjw0f.x1hc1fzr.x1tkvqr7 > div > div.x1odjw0f.xr9ek0c.xyorhqc > div > div:nth-child(3) > div > div > div > div > div._alc_._ald3 > div._aldd > div > div > p', 'İstemiyorum');

            // Wait and click on the fourth option
            await page.waitForSelector('#app > div > span:nth-child(3) > div > div > div > div > div > div > div > div > div.x1n2onr6.xyw6214.x78zum5.x1r8uery.x1iyjqo2.xdt5ytf.x6ikm8r.x1odjw0f.x1hc1fzr.x1tkvqr7 > div > div.x1odjw0f.xr9ek0c.xyorhqc > div > div:nth-child(4) > div > div > div > div > div._alc_._ald3 > div._aldd > div > div > p');
            await page.click('#app > div > span:nth-child(3) > div > div > div > div > div > div > div > div > div.x1n2onr6.xyw6214.x78zum5.x1r8uery.x1iyjqo2.xdt5ytf.x6ikm8r.x1odjw0f.x1hc1fzr.x1tkvqr7 > div > div.x1odjw0f.xr9ek0c.xyorhqc > div > div:nth-child(4) > div > div > div > div > div._alc_._ald3 > div._aldd > div > div > p');

            // Type "Beni Arayın"
            await page.type('#app > div > span:nth-child(3) > div > div > div > div > div > div > div > div > div.x1n2onr6.xyw6214.x78zum5.x1r8uery.x1iyjqo2.xdt5ytf.x6ikm8r.x1odjw0f.x1hc1fzr.x1tkvqr7 > div > div.x1odjw0f.xr9ek0c.xyorhqc > div > div:nth-child(4) > div > div > div > div > div._alc_._ald3 > div._aldd > div > div > p', 'Beni Arayın');

            // Delay before moving to the next contact
            await delay(1000);


            // Click on the element to finish the survey and submit the response
            await page.click("#app > div > span:nth-child(3) > div > div > div > div > div > div > div > div > div.x1n2onr6.xyw6214.x78zum5.x1r8uery.x1iyjqo2.xdt5ytf.x6ikm8r.x1odjw0f.x1hc1fzr.x1tkvqr7 > div > div.x78zum5.x6s0dn4.xh8yej3.x1jchvi3.xdod15v.xx6bls6 > div > div");
            await delay(500);
            // Click on the element to finish the survey and submit the response
            await page.click("#app > div > span:nth-child(3) > div > div > div > div > div > div > div > div > div.xh8yej3.x78zum5.x13a6bvl.xwvwv9b.x1jn9dgz.x11fxgd9 > div > span");

            console.log("Survey completed and response sent.");
            // Delay before moving to the next contact
            await delay(1000);  } 
            catch (error) {
                console.log(ex_data.number+ " Numarasında Hata oluştu: ", error);
            }
          }

          console.log("All messages have been sent.");
          await browser.close();
        } catch (error) {
          console.log("Hata oluştu: ", error);
        }
      });
  });

com.command("whatsapp").description("Send whatsapp message to customers").action(async () => {
    inquirer
            .prompt([
                {
                    type: "list",
                    name: "wp_excel",
                    message: "Whatsapp Excel Dosyası:",
                    choices: () => {
                        const files = fs.readdirSync("excel");
                        return files;
                    },
                },
                {
                    type: "list",
                    name: "wp_template",
                    message: "Whatsapp Şablonu:",
                    choices: () => {
                        const files = fs.readdirSync("templates");
                        return files;
                    },
                },
             
            ])   .then(async (answers) => {
                try {
                    const wp_template = JSON.parse(
                        fs.readFileSync(`templates/${answers.wp_template}`, "utf8")
                    );
                    if (!wp_template) {
                        console.log("Whatsapp template dosyası bulunamadı!");
                        return;
                    }
             
                    let excel_data = utils.xslxToJson(
                        `excel/${answers.wp_excel}`
                    );
                    if (!excel_data) {
                        console.log("Excel dosyası bulunamadı!");
                        return;
                    }
                    let logs = [];
                    for await (ex_data of excel_data) {
                        let template = wp_template
            
                        let sending_data = {...template.wp_template}
                        sending_data.to= `90${ex_data.number}`
                        sending_data.template.components[0].parameters[0].text=ex_data.header||""
                        sending_data.template.components[0].parameters[1].text=ex_data.body ||""
                        sending_data.template.components[0].parameters[2].text=ex_data.footer||""
                        fs.writeFileSync("data.json", JSON.stringify(sending_data));
                        console.log(sending_data)

                        try {
                            const result = await axios.post(template.link,sending_data,{
                                headers:{
                                    Authorization: `Bearer ${template.token}`
                                }
                            });
                            try {
                                // bu kısım whatappın döndüğü webhookları yakalaycak olan servera bildiriyoruz
                                axios.post("https://whatsapp-controller.rahatyonetim.com/v1/whatsapp//save-id",{
                                    "wamid":result.data.messages[0].id,
                                    "url":"script"
                                },{
                                    headers:{
                                        Authorization: `Bearer H#Rs&iy1&x$TLWp#x0JgXf1!x5MT8Wml9yjC4D#J`}})
                            } catch (error) {
                                
                            }
                            console.log("Whatsapp Mesajı Gönderildi: ", ex_data.number);
                        } catch (error) {
                            logs.push({
                                mail: ex_data.number,
                                status: error.status,
                                id: error.id,
                                message: error.message,
                                details: error.details,
                            });
                        }
                        await delay(1000);
                    }
                    // utils.saveToExcel(
                    //     `logs/whatsapp/${new Date()}.xlsx`,
                    //     logs
                    // );
                } catch (error) {
                    console.log("Hata oluştu: ", error);
                }
            });
});

com.command("mail")
    .description("Send mail to customers")
    .action(async () => {
        inquirer
            .prompt([
                {
                    type: "list",
                    name: "client_conf",
                    message: "Gönderici Client Konfigürasyonu:",
                    choices: () => {
                        const files = fs.readdirSync("config");
                        return files;
                    },
                },
                {
                    type: "list",
                    name: "mail_excel",
                    message: "Mail Excel Dosyası:",
                    choices: () => {
                        const files = fs.readdirSync("excel");
                        return files;
                    },
                },
                {
                    type: "list",
                    name: "type",
                    message: "Mail Şablonu:",
                    choices: () => {
                        const files = fs.readdirSync("templates");
                        return files;
                    },
                },
                {
                    type: "list",
                    name: "info",
                    message: "Mail İçerik Bilgisi:",
                    choices: () => {
                        const files = fs.readdirSync("info");
                        return files;
                    },
                },
            ])
            .then(async (answers) => {
                try {
                    const config = JSON.parse(
                        fs.readFileSync(`config/${answers.client_conf}`, "utf8")
                    );
                    const mailgun = new Mailgun(formData);
                    const client = mailgun.client({
                        username: "api",
                        key: config.api_key,
                        url: config.region,
                    });
                    const glob_info = JSON.parse(
                        fs.readFileSync(`info/${answers.info}`, "utf8")
                    );
                    if (!glob_info) {
                        console.log("Bilgi dosyası bulunamadı!");
                        return;
                    }
                    let template = fs.readFileSync(
                        `templates/${answers.type}`,
                        "utf8"
                    );
                    if (!template) {
                        console.log("Şablon dosyası bulunamadı!");
                        return;
                    }
                    let excel_data = utils.xslxToJson(
                        `excel/${answers.mail_excel}`
                    );
                    if (!excel_data) {
                        console.log("Excel dosyası bulunamadı!");
                        return;
                    }
                    let logs = [];
                    for await (ex_data of excel_data) {
                        let info = { ...glob_info };
                        let mail_template = template;
                        for await (key of Object.keys(info)) {
                            if (info[key].includes("{")) {
                                let temp = info[key].split("{");
                                let variable = temp[1].split("}")[0];
                                if (ex_data[variable]) {
                                    info[key] = info[key].replaceAll(
                                        `{${variable}}`,
                                        ex_data[variable]
                                    );
                                }
                            }
                            mail_template = mail_template.replaceAll(
                                `[${key}]`,
                                info[key]
                            );
                        }
                        const sending_data = {
                            from: info.from,
                            to: info.to,
                            subject: info.subject,
                            html: mail_template,
                        };
                        try {
                            const sending = await client.messages.create(
                                config.url,
                                sending_data
                            );
                            logs.push({
                                mail: info.to,
                                status: sending.status,
                                id: sending.id
                                    .replace("<", "")
                                    .replace(">", ""),
                                message: sending.message,
                                details: sending.details,
                            });
                        } catch (error) {
                            logs.push({
                                mail: info.to,
                                status: error.status,
                                id: error.id,
                                message: error.message,
                                details: error.details,
                            });
                        }
                        console.log("Mail gönderildi: ", info.to);
                        await delay(1000);
                    }
                    utils.saveToExcel(
                        `logs/${
                            answers.client_conf.split(".")[0]
                        }_${new Date()}.xlsx`,
                        logs
                    );
                } catch (error) {
                    console.log("Hata oluştu: ", error);
                }
            });
    });

com.command("check_id")
    .description("Check mailgun status from id")
    .action(async () => {
        inquirer
            .prompt([
                {
                    type: "list",
                    name: "client_conf",
                    message: "Gönderici Client Konfigürasyonu:",
                    choices: () => {
                        const files = fs.readdirSync("config");
                        return files;
                    },
                },
                {
                    type: "input",
                    name: "mailgun_id",
                    message: "Mailgun Mail ID:",
                },
            ])
            .then(async (answers) => {
                try {
                    const config = JSON.parse(
                        fs.readFileSync(`config/${answers.client_conf}`, "utf8")
                    );
                    const mailgun = new Mailgun(formData);
                    const client = mailgun.client({
                        username: "api",
                        key: config.api_key,
                        url: config.region,
                    });
                    const sending = await client.events.get(config.url, {
                        "message-id": answers.mailgun_id,
                    });
                    console.log(
                        "Mail durumu: ",
                        sending.items.map((item) => item["event"])
                    );
                } catch (error) {
                    console.log("Hata oluştu: ", error);
                }
            });
    });

com.command("check_file")
    .description("Check mailgun status from file")
    .action(async () => {
        inquirer
            .prompt([
                {
                    type: "list",
                    name: "client_conf",
                    message: "Gönderici Client Konfigürasyonu:",
                    choices: () => {
                        const files = fs.readdirSync("config");
                        return files;
                    },
                },
                {
                    type: "list",
                    name: "excel_log_file",
                    message: "Mail Excel Dosyası:",
                    choices: () => {
                        const files = fs.readdirSync("logs");
                        return files;
                    },
                },
            ])
            .then(async (answers) => {
                try {
                    const config = JSON.parse(
                        fs.readFileSync(`config/${answers.client_conf}`, "utf8")
                    );
                    const mailgun = new Mailgun(formData);
                    const client = mailgun.client({
                        username: "api",
                        key: config.api_key,
                        url: config.region,
                    });
                    let excel_data = utils.xslxToJson(
                        `logs/${answers.excel_log_file}`
                    );
                    if (!excel_data) {
                        console.log("Excel dosyası bulunamadı!");
                        return;
                    }
                    let logs = [];
                    for await (ex_data of excel_data) {
                        const sending = await client.events.get(config.url, {
                            "message-id": ex_data.id,
                        });
                        sending.items.map((item) => {
                            logs.push({
                                mail: ex_data.mail,
                                status: item["event"],
                            });
                        });
                    }
                    utils.saveToExcel(
                        `logs/checked_${answers.excel_log_file}`,
                        logs
                    );
                    console.log(
                        "İşlem tamamlandı. Kontrol sonuç dosyası: ",
                        `logs/checked_${answers.excel_log_file}`
                    );
                } catch (error) {
                    console.log("Hata oluştu: ", error);
                }
            });
    });

com.parse(process.argv);
