import chalk from 'chalk';
import net from 'net';

// Env
const DOTA_NETCON_PORT = process.env.DOTA_NETCON_PORT
const DUMPER_TAG = process.env.DUMPER_TAG

export class VConsoleClient {
    constructor(port = DOTA_NETCON_PORT) {
        this.port = port;
        this.client = new net.Socket();
        this.connected = false;
        this.onLog = null;
    }

    Connect(){
        return new Promise((resolve, reject) => {
            this.client.connect(this.port, '127.0.0.1', () => {
                this.connected = true;
                console.log(chalk.green(` [port: ${this.port}]`));
                resolve();
            });

            this.client.on('data', (data) => {
                // NetCon присылает чистый текст. Разбиваем на строки.
                const lines = data.toString('utf8').split('\n');
                
                for (let line of lines) {
                    line = line.replace('\r', '').trim();
                    if (line && this.onLog) {
                        this.onLog(line);
                    }
                }
            });

            this.client.on('error', (err) => {
                this.connected = false;
                reject(err);
            });

            this.client.on('close', () => {
                this.connected = false;
            });
        });
    }

    Send(command){
        if (!this.connected) return;

        this.client.write(command + '\r\n')
    }

    Print(message){
        this.Send(`echo ${DUMPER_TAG} ${message}`)
    }

    Disconnect(){
        if (this.connected) {
            this.client.destroy();
            console.log(chalk.yellow('[NETCON] Disconnected.'));
        }
    }
}