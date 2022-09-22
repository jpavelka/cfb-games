export const groupByKey = (newKey: string, lastKey: string | undefined) => {
    return lastKey === undefined ? newKey : lastKey + '__' + newKey
}