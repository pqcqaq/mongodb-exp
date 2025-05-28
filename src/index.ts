import { MongoClient } from "mongodb";

async function runBenchmark() {
    const url = "mongodb://localhost:27017";
    const client = new MongoClient(url);
    await client.connect();
    const db = client.db("testDB");
    const col = db.collection("bench");

    // 1. 生成 100 万条随机文档（每条包含 name、age 和随机 payload 字段）
    const docs = Array.from({ length: 1000000 }, (_, i) => ({
        name: `User${i}`,
        age: Math.floor(Math.random() * 100),
        // 生成 100-200 字节随机字符串作为 payload
        payload: [...Array(100 + Math.floor(Math.random() * 100))]
            .map(() => Math.random().toString(36)[2]).join("")
    }));

    console.time("插入100万条数据");
    await col.insertMany(docs);
    console.timeEnd("插入100万条数据");

    // 插入完成之后_id会自动回填s
    const rdocs = docs as (typeof docs[0] & { _id: any })[];

    // 2. 主键索引查询（_id）
    console.time("主键查询1000次");
    for (let i = 0; i < 1000; i++) {
        await col.findOne({ _id: rdocs[i]._id });
    }
    console.timeEnd("主键查询1000次");

    // 3. 无索引字段查询（age）
    console.time("无索引查询1000次");
    for (let i = 0; i < 1000; i++) {
        await col.findOne({ age: rdocs[i].age });
    }
    console.timeEnd("无索引查询1000次");

    // 4. 聚合查询（示例：计算 age 总和）
    console.time("聚合查询");
    await col.aggregate([{ $group: { _id: null, totalAge: { $sum: "$age" } } }]).toArray();
    console.timeEnd("聚合查询");

    await client.close();
}

runBenchmark();
