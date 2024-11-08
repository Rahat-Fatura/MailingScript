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
