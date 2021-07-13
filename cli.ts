import { Command } from "https://deno.land/x/cliffy@v0.19.2/command/mod.ts";
import { BufWriter } from "https://deno.land/std@0.101.0/io/bufio.ts";

const base64abc =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";

await new Command()
  .name("binary-embed")
  .version("0.1.0")
  .description("Embed binary to js/ts file")
  .arguments("<input:string> <output:string>")
  .action((_options, input: string, output: string) => {
    main(input, output);
  })
  .parse(Deno.args);

async function encodeTo(uint8: Uint8Array, writer: BufWriter) {
  let i;
  const buffer = new Uint8Array(4);
  const l = uint8.length;
  for (i = 2; i < l; i += 3) {
    buffer[0] = base64abc.charCodeAt(uint8[i - 2] >> 2);
    buffer[1] = base64abc.charCodeAt(
      ((uint8[i - 2] & 0x03) << 4) | (uint8[i - 1] >> 4),
    );
    buffer[2] = base64abc.charCodeAt(
      ((uint8[i - 1] & 0x0f) << 2) | (uint8[i] >> 6),
    );
    buffer[3] = base64abc.charCodeAt(uint8[i] & 0x3f);
    await writer.write(buffer);
  }
  if (i === l + 1) {
    // 1 octet yet to write
    buffer[0] = base64abc.charCodeAt(uint8[i - 2] >> 2);
    buffer[1] = base64abc.charCodeAt((uint8[i - 2] & 0x03) << 4);
    buffer[2] = "=".charCodeAt(0);
    buffer[3] = "=".charCodeAt(0);
    await writer.write(buffer);
  } else if (i === l) {
    // 2 octets yet to write
    buffer[0] = base64abc.charCodeAt(uint8[i - 2] >> 2);
    buffer[1] = base64abc.charCodeAt(
      ((uint8[i - 2] & 0x03) << 4) | (uint8[i - 1] >> 4),
    );
    buffer[2] = base64abc.charCodeAt((uint8[i - 1] & 0x0f) << 2);
    buffer[3] = "=".charCodeAt(0);
    await writer.write(buffer);
  }
}

async function main(input: string, output: string) {
  const encoder = new TextEncoder();
  const file = await Deno.open(output, {
    write: true,
    create: true,
    truncate: true,
  });
  const writer = new BufWriter(file, 1024);
  const contents = await Deno.readFile(input);
  const len = contents.byteLength;
  await writer.write(encoder.encode(`const raw = atob("`));
  await encodeTo(contents, writer);
  await writer.write(encoder.encode(`");\n`));
  await writer.write(encoder.encode(`const data = new Uint8Array(${len});\n`));
  await writer.write(
    encoder.encode(
      `for (let i = 0; i < ${len}; i++) data[i] = raw.charCodeAt(i);\n`,
    ),
  );
  await writer.write(encoder.encode(`export default data;\n`));
  await writer.flush();
  file.close();
}
