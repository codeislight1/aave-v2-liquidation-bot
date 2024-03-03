import fs from "fs";

export class BaseOps {
    readonly file: string;
    readonly defaultValue: Object;

    constructor(file: string, defaultValue: Object) {
        this.file = file;
        this.defaultValue = defaultValue;
        fs.readFile(this.file, "utf-8", (err, res) => {
            if (err || !res) {
                this.write(defaultValue);
            }
        })
    }

    protected _reset() {
        fs.readFile(this.file, "utf-8", (err, res) => {
            if (err || !res) {
                this.write(this.defaultValue);
            }
        })
    }

    read() {
        const res = fs.readFileSync(this.file, 'utf-8')
        return JSON.parse(res) as Object;
    }

    protected write(object: Object) {
        fs.writeFileSync(this.file, JSON.stringify(object))
    }
}