import prisma from "@/lib/prisma";

export default async function handler(req, res) {
  const { month, year } = req.query;

  if (!month || !year) {
    return res.status(400).json({ error: "Month and year are required" });
  }

  try {
    const result = await prisma.salesFact.groupBy({
      by: ["customerName"],
      where: {
        periodMonth: Number(month),
        periodYear: Number(year),
      },
      _sum: {
        gross: true,
      },
      orderBy: {
        _sum: {
          gross: "desc",
        },
      },
      take: 5,
    });

    const formatted = result.map((entry) => ({
      customer: entry.customerName || "Unknown",
      amount: entry._sum.gross || 0,
    }));

    res.status(200).json({ data: formatted });
  } catch (error) {
    console.error("API Error (Top Customers):", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
