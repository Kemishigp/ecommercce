import Order from "../models/order.model.js";
import Product from "../models/product.model.js";
import User from "../models/user.model.js";

// =========================
// MAIN ANALYTICS SUMMARY
// =========================
export const getAnalyticsData = async () => {
	try {
		const totalUsers = await User.countDocuments();
		const totalProducts = await Product.countDocuments();

		const salesData = await Order.aggregate([
			{
				$group: {
					_id: null,
					totalSales: { $sum: 1 },
					totalRevenue: { $sum: "$totalAmount" },
				},
			},
		]);

		const { totalSales = 0, totalRevenue = 0 } = salesData[0] || {};

		return {
			users: totalUsers,
			products: totalProducts,
			totalSales,
			totalRevenue,
		};
	} catch (error) {
		throw error;
	}
};

// =========================
// DAILY SALES FOR CHARTS
// =========================
export const getDailySalesData = async (startDate, endDate) => {
	try {
		const dailySalesData = await Order.aggregate([
			{
				$match: {
					createdAt: {
						$gte: startDate,
						$lte: endDate,
					},
				},
			},
			{
				$group: {
					_id: {
						$dateToString: {
							format: "%Y-%m-%d",
							date: "$createdAt",
							timezone: "America/Mexico_City",
						},
					},
					sales: { $sum: 1 },
					revenue: { $sum: "$totalAmount" },
				},
			},
			{ $sort: { _id: 1 } },
		]);

		const dateArray = getDatesInRange(startDate, endDate);

		return dateArray.map((date) => {
			const found = dailySalesData.find((d) => d._id === date);
			return {
				date,
				sales: found?.sales || 0,
				revenue: found?.revenue || 0,
			};
		});
	} catch (error) {
		throw error;
	}
};

// =========================
// UTILS
// =========================
function getDatesInRange(startDate, endDate) {
	const dates = [];
	let currentDate = new Date(startDate);

	while (currentDate <= endDate) {
		dates.push(formatDateLocal(currentDate));
		currentDate.setDate(currentDate.getDate() + 1);
	}

	return dates;
}

function formatDateLocal(date) {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}
