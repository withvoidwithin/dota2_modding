import net from 'net';
import chalk from 'chalk';

export class VConsoleClient {
    constructor(port = 2121) { // Используем порт 2121 по умолчанию для NetCon
        this.port = port;
        this.client = new net.Socket();
        this.connected = false;
        this.onLog = null;
    }

    connect() {
        return new Promise((resolve, reject) => {
            this.client.connect(this.port, '127.0.0.1', () => {
                this.connected = true;
                console.log(chalk.green(`[NETCON] Connected to Dota 2 on port ${this.port}!`));
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

    sendCommand(command) {
        if (!this.connected) return;

        this.client.write(command + '\r\n'); 
        console.log(chalk.gray(`[NETCON] Sent: ${command}`)); // Отправляем строку и нажимаем "Enter" (\r\n)
    }

    disconnect() {
        if (this.connected) {
            this.client.destroy();
            console.log(chalk.yellow('[NETCON] Disconnected.'));
        }
    }
}