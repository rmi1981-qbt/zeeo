export const generateRandomName = (): string => {
    const firsts = ['João', 'Maria', 'Pedro', 'Ana', 'Lucas', 'Julia', 'Marcos', 'Fernanda', 'Carlos', 'Beatriz'];
    const lasts = ['Silva', 'Santos', 'Oliveira', 'Souza', 'Rodrigues', 'Ferreira', 'Alves', 'Pereira', 'Lima', 'Gomes'];
    const first = firsts[Math.floor(Math.random() * firsts.length)];
    const last = lasts[Math.floor(Math.random() * lasts.length)];
    return `${first} ${last}`;
};

export const generateRandomUnit = (): string => {
    const blocks = ['A', 'B', 'C', '1', '2', '3', 'Ipê', 'Jacarandá', 'Araucária'];
    const aptos = ['11', '12', '21', '22', '31', '32', '41', '42', '51', '52'];
    const isHouse = Math.random() > 0.5;

    if (isHouse) {
        return `Casa ${Math.floor(Math.random() * 150) + 1}`;
    } else {
        const block = blocks[Math.floor(Math.random() * blocks.length)];
        const apto = aptos[Math.floor(Math.random() * aptos.length)];
        return `Bloco ${block} - Apto ${apto}`;
    }
};

export const generateRandomPlate = (): string => {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const l1 = letters[Math.floor(Math.random() * 26)];
    const l2 = letters[Math.floor(Math.random() * 26)];
    const l3 = letters[Math.floor(Math.random() * 26)];

    // Mercosul format: LLLNLNN
    const n1 = Math.floor(Math.random() * 10);
    const l4 = letters[Math.floor(Math.random() * 26)];
    const n2 = Math.floor(Math.random() * 10);
    const n3 = Math.floor(Math.random() * 10);

    return `${l1}${l2}${l3}${n1}${l4}${n2}${n3}`;
};
