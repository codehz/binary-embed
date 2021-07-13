import { encode } from "https://deno.land/std@0.101.0/encoding/base64.ts";
import { Command } from "https://deno.land/x/cliffy@v0.19.2/command/mod.ts";

await new Command()
  .name("binary-pack")
  .version("0.1.0")
  .description("Package binary to js/ts file")
  .arguments("<input:string> <output:string>")
  .action((_options, input: string, output: string) => {
    main(input, output);
  })
  .parse(Deno.args);

async function main(input: string, output: string) {
  const encoder = new TextEncoder();
  const file = await Deno.open(output, {
    write: true,
    create: true,
    truncate: true,
  });
  const contents = await Deno.readFile(input);
  const base64 = encode(contents);
  const len = contents.byteLength;
  await file.write(encoder.encode(`const raw = atob("`));
  await file.write(encoder.encode(base64));
  await file.write(encoder.encode(`");\n`));
  await file.write(encoder.encode(`const data = new Uint8Array(${len});\n`));
  await file.write(
    encoder.encode(
      `for (let i = 0; i < ${len}; i++) data[i] = raw.charCodeAt(i);\n`,
    ),
  );
  await file.write(encoder.encode(`export default data;\n`));
  file.close();
}
