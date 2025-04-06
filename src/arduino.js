const connectButton = document.getElementById("connectButton");
const outputValue = document.getElementById("output");

connectButton.addEventListener("click", async () => {
  try {
    console.log("Requesting serial port access...");
    const port = await navigator.serial.requestPort();
    console.log("Serial port selected:", port);

    await port.open({ baudRate: 9600 });
    console.log("Serial port opened with baudRate 9600");

    const textDecoder = new TextDecoderStream();
    const readableStreamClosed = port.readable.pipeTo(textDecoder.writable);
    const reader = textDecoder.readable.getReader();
    console.log("Started reading from serial port...");

    // Continuously read data from the Arduino.
    while (true) {
      const { value, done } = await reader.read();
      if (done) {
        console.log("Reader closed");
        reader.releaseLock();
        break;
      }

      var valueNum = Number(value.trim());
      if (valueNum < 1 && valueNum != 0) {
        outputValue.innerHTML = valueNum;
      }
    }
  } catch (error) {
    console.error("Error connecting to Arduino:", error);
  }
});
