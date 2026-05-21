const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { Builder, By, Select } = require("selenium-webdriver");

const PAGE_URL = "file:///" + path.join(__dirname, "..", "index.html").replace(/\\/g, "/");

const EDGE_PATHS = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
];

let driver;

async function isElementHidden(element) {
  return (await element.getAttribute("hidden")) !== null;
}

async function clickHiddenCheckbox(id) {
  const checkbox = await driver.findElement(By.id(id));
  await driver.executeScript("arguments[0].click();", checkbox);
}

async function submitForm() {
  const button = await driver.findElement(By.css("button[type='submit']"));
  await driver.executeScript("arguments[0].scrollIntoView({block: 'center'});", button);
  await button.click();
}

async function getErrorText(field) {
  return driver.findElement(By.css(`.form__error[data-for="${field}"]`)).getText();
}

async function waitForSuccessScreen() {
  await driver.wait(async () => {
    const success = await driver.findElement(By.id("success"));
    const form = await driver.findElement(By.id("feedback-form"));
    return !(await isElementHidden(success)) && (await isElementHidden(form));
  }, 5000);
}

async function waitForFormScreen() {
  await driver.wait(async () => {
    const success = await driver.findElement(By.id("success"));
    const form = await driver.findElement(By.id("feedback-form"));
    return (await isElementHidden(success)) && !(await isElementHidden(form));
  }, 5000);
}

function headlessArgs() {
  return ["--headless=new", "--window-size=1280,800", "--disable-gpu", "--no-sandbox", "--disable-dev-shm-usage"];
}

async function createChromeDriver() {
  const chrome = require("selenium-webdriver/chrome");
  const options = new chrome.Options();
  options.addArguments(...headlessArgs());
  return new Builder().forBrowser("chrome").setChromeOptions(options).build();
}

async function createEdgeDriver() {
  const { download } = require("edgedriver");
  const edge = require("selenium-webdriver/edge");

  const options = new edge.Options();
  options.addArguments(...headlessArgs());

  const binary = EDGE_PATHS.find((p) => fs.existsSync(p));
  if (binary) options.setBinaryPath(binary);

  const driverPath = await download();
  const service = new edge.ServiceBuilder(driverPath);

  return new Builder()
    .forBrowser("MicrosoftEdge")
    .setEdgeOptions(options)
    .setEdgeService(service)
    .build();
}

async function createDriver() {
  if (process.env.CI === "true") {
    return createChromeDriver();
  }
  if (process.platform === "win32") {
    return createEdgeDriver();
  }
  return createChromeDriver();
}

before(async function () {
  this.timeout(120000);
  driver = await createDriver();
  await driver.get(PAGE_URL);
});

after(async function () {
  if (driver) await driver.quit();
});

describe("Форма обратной связи", function () {
  this.timeout(10000);

  beforeEach(async function () {
    await driver.get(PAGE_URL);
  });

  it("открывается с заголовком и полями формы", async function () {
    const title = await driver.getTitle();
    assert.equal(title, "Форма обратной связи");

    const heading = await driver.findElement(By.css("h1")).getText();
    assert.equal(heading, "Обратная связь");

    for (const id of ["name", "email", "topic", "message"]) {
      assert.ok(await driver.findElement(By.id(id)).isDisplayed());
    }
    assert.ok(await driver.findElement(By.css("label.checkbox")).isDisplayed());

    const submitBtn = await driver.findElement(By.css("button[type='submit']"));
    assert.equal(await submitBtn.getText(), "Отправить");

    const success = await driver.findElement(By.id("success"));
    assert.ok(await isElementHidden(success));
  });

  it("при пустой отправке показывает ошибки валидации", async function () {
    await submitForm();

    await driver.wait(
      async () => {
        const errors = await driver.findElements(By.css(".form__error"));
        for (const el of errors) {
          if ((await el.getText()).length > 0) return true;
        }
        return false;
      },
      5000
    );

    assert.match(await getErrorText("name"), /имя/i);
    assert.match(await getErrorText("email"), /корректный email/);
    assert.match(await getErrorText("topic"), /тему обращения/);
    assert.match(await getErrorText("message"), /10 символов/);
    assert.match(await getErrorText("agree"), /согласие/);

    assert.ok(await isElementHidden(await driver.findElement(By.id("success"))));
  });

  it("при корректном заполнении показывает экран «Спасибо»", async function () {
    await driver.findElement(By.id("name")).sendKeys("Алексей");
    await driver.findElement(By.id("email")).sendKeys("alex@test.ru");
    await new Select(driver.findElement(By.id("topic"))).selectByValue("question");
    await driver
      .findElement(By.id("message"))
      .sendKeys("Тестовое сообщение для проверки формы.");
    await clickHiddenCheckbox("agree");
    await submitForm();

    await waitForSuccessScreen();
    const success = await driver.findElement(By.id("success"));
    assert.ok(await success.isDisplayed());

    assert.ok(await isElementHidden(await driver.findElement(By.id("feedback-form"))));

    const successText = await driver.findElement(By.id("success-text")).getText();
    assert.match(successText, /Алексей/);
    assert.match(successText, /Вопрос/);

    const thanks = await driver.findElement(By.css(".success h2")).getText();
    assert.equal(thanks, "Спасибо!");
  });

  it("кнопка «Отправить ещё» возвращает к пустой форме", async function () {
    await driver.findElement(By.id("name")).sendKeys("Мария");
    await driver.findElement(By.id("email")).sendKeys("maria@test.ru");
    await new Select(driver.findElement(By.id("topic"))).selectByValue("suggestion");
    await driver
      .findElement(By.id("message"))
      .sendKeys("Предложение по улучшению сервиса.");
    await clickHiddenCheckbox("agree");
    await submitForm();

    await waitForSuccessScreen();
    await driver.findElement(By.id("reset-btn")).click();

    await waitForFormScreen();
    const form = await driver.findElement(By.id("feedback-form"));
    assert.ok(await form.isDisplayed());

    assert.ok(await isElementHidden(await driver.findElement(By.id("success"))));

    const nameValue = await driver.findElement(By.id("name")).getAttribute("value");
    assert.equal(nameValue, "");

    const agreeChecked = await driver.findElement(By.id("agree")).isSelected();
    assert.equal(agreeChecked, false);
  });
});
