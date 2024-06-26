import PrismaDB from "@/lib/db";
import getSession from "@/lib/session/getSession";
import { FormatToWon } from "@/lib/utils";
import { UserIcon } from "@heroicons/react/24/solid";
import { revalidateTag, unstable_cache } from "next/cache";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

export const dynamicParams = true;

const getCachedProduct = unstable_cache(getProduct, ["product-detail"], {
    tags: ["product-detail", "detail", "post-malone"],
});

const getCachedProductTitle = unstable_cache(
    getProductTitle,
    ["product-title"],
    {
        tags: ["product-title", "title", "post-malone"],
    }
);

export async function generateMetadata({ params }: { params: { id: string } }) {
    const product = await getCachedProductTitle(+params.id);

    return {
        title: `${product?.title}`,
    };
}

async function getProduct(id: number) {
    console.log("run getProduct function!");
    const product = await PrismaDB.product.findUnique({
        where: {
            id: id,
        },
        include: {
            user: {
                select: {
                    username: true,
                    profile_photo: true,
                },
            },
        },
    });
    return product;
}

async function getProductTitle(id: number) {
    console.log("run getProductTitle function!");
    const product = await PrismaDB.product.findUnique({
        where: {
            id: id,
        },
        select: {
            title: true,
        },
    });
    return product;
}

async function checkIsOwner(userId: number) {
    // const session = await getSession();
    // if (session.id) {
    //     return session.id === userId;
    // }
    return false;
}

export default async function ProductDetail({
    params,
}: {
    params: { id: string };
}) {
    const id = Number(params.id);
    if (isNaN(id)) {
        return notFound();
    }

    const product = await getCachedProduct(id);
    if (!product) {
        return notFound();
    }

    const isOwner = await checkIsOwner(product.userId);

    async function DeleteProduct() {
        "use server";
        await PrismaDB.product.delete({
            where: {
                id: id,
            },
        });
        redirect("/products");
    }

    async function Revalidate() {
        "use server";
        revalidateTag("post-malone");
    }

    return (
        <div>
            <div className="relative aspect-square">
                <Image
                    fill
                    src={`${product.photo}/public`}
                    alt={product.title}
                    className="object-cover"
                />
            </div>
            <div className="flex items-center gap-3 p-5 border-b border-neutral-700">
                <div className="overflow-hidden rounded-full size-10">
                    {product.user.profile_photo !== null ? (
                        <Image
                            src={product.user.profile_photo}
                            alt={product.user.username}
                            width={40}
                            height={40}
                        />
                    ) : (
                        <UserIcon />
                    )}
                </div>
                <div>
                    <h3>{product.user.username}</h3>
                </div>
            </div>
            <div className="p-5 ">
                <h1 className="text-2xl font-semibold">{product.title}</h1>
                <p>{product.description}</p>
            </div>

            <form action={Revalidate}>
                <button>Revalidate</button>
            </form>

            <div className="fixed bottom-0 left-0 flex items-center justify-between w-full p-5 pb-10 bg-neutral-800">
                <span className="text-lg font-semibold">
                    ₩ {FormatToWon(product.price)}
                </span>
                <form className="flex gap-2" action={DeleteProduct}>
                    {isOwner ? (
                        <button
                            className="bg-red-500 px-5 py-2.5 rounded-md text-[ghostwhite] font-semibold hover:bg-red-600 transition-all"
                            type="submit"
                        >
                            Delete
                        </button>
                    ) : (
                        <Link
                            href={``}
                            className="bg-green-500 px-5 py-2.5 rounded-md text-[ghostwhite] font-semibold hover:bg-green-600 transition-all"
                        >
                            Chat
                        </Link>
                    )}
                </form>
            </div>
        </div>
    );
}

export async function generateStaticParams() {
    const products = await PrismaDB.product.findMany({
        select: {
            id: true,
        },
    });

    // return products.map((product) => ({
    //     id: product.id + "",
    // }));

    return [];
}
