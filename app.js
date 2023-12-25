import { chromium } from "playwright";
import express from 'express';
import cors from 'cors';
// generar resultador 

const app = express();
app.use(cors());
const port = 3000;

async function getResources(date, origin, destiny){
    const browser = await chromium.launch();
    const page = await browser.newPage();
    await page.goto('https://www.wwalliance.com/wwaonline/sch/index.php');
    await page.click('input[id="Idfromdate"]'); 
    const tds = await page.$$('td[data-handler="selectDay"][data-month="11"][data-year="2023"]');
    for (let td of tds) {
        const anchor = await td.$('a');
        const anchorText = await page.evaluate(anchor => anchor.textContent, anchor);
        if (anchorText.trim() === date) {
            await anchor.click();
            await page.waitForTimeout(1000);
            break;
        }
    }
    await page.click('i[id="listoriginDiv1"]');
    await page.click('span[id="'+origin+'"]');
    await page.waitForTimeout(1000); // Espera 1 segundo
    await page.click('i[id="listdestinationDiv"]');
    await page.click('span[id="'+destiny+'"]');
    
    await page.evaluate(() => {
        const form = document.querySelector("#Idschform");
        form.submit();
    });
    await page.waitForNavigation({ waitUntil : 'networkidle'});

    const headers = await page.$$eval('#scheduleResultTable thead tr th', ths => {
        let detailsFound = false;
        return ths.map(th => {
            const text = th.textContent.trim();
            if (text === 'Details') {
                detailsFound = true;
            }
            if (!detailsFound) {
                return text;
            }
        }).filter(Boolean);
    });
    
    // Para los rows
    const rows = await page.$$eval('#scheduleResultTable tbody tr.sch_res', trs => trs.map(tr => {
        const tds = Array.from(tr.getElementsByTagName('td'));
        return tds.map((td, index) => {
            if (index === 1) { // Si es el td con el índice 1
                const anchor = td.querySelector('a');
                if (anchor) {
                    return anchor.textContent.trim(); // Retorna solo el texto dentro del <a>
                }
            } else {
                const span = td.querySelector('span');
                if (span) {
                    return span.nextSibling.nodeValue.trim(); // Retorna el texto fuera del <span>
                }
            }
        }).filter(Boolean);
    }));
    const infoMessage = await page.$eval('.info-message', span => span.textContent.trim());

    const result = {
        fecha: infoMessage,
        headers: headers,
        rows: rows
    };

    await browser.close();
    
    return result;
    
}

app.get('/', async (req, res) => {
    const date = req.query.date;
    const origin = req.query.origin;
    const destiny = req.query.destiny;
    const result = await getResources(date, origin, destiny);
    res.json(result);
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});