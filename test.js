let query = {
    "name": {
        $regex: "John",
        $options: "i"
    }
}

query = {
    ...query,
    "age": {
        $gt: 30
    }
}

console.log(query)  