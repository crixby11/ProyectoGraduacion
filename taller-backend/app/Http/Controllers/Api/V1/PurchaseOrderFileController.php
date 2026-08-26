<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\PurchaseOrder;
use App\Models\PurchaseOrderFile;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class PurchaseOrderFileController extends Controller
{
    public function index(PurchaseOrder $purchaseOrder)
    {
        return response()->json($purchaseOrder->files);
    }

    public function store(Request $request, PurchaseOrder $purchaseOrder)
    {
        $request->validate([
            'file'        => 'required|file|max:10240|mimes:jpg,jpeg,png,gif,webp,pdf,doc,docx,xls,xlsx,txt,csv',
            'description' => 'nullable|string|max:255',
        ]);

        $file         = $request->file('file');
        $originalName = $file->getClientOriginalName();
        $extension    = $file->getClientOriginalExtension();
        $storedName   = Str::uuid() . '.' . $extension;
        $path         = $file->storeAs("purchase-order-files/{$purchaseOrder->id}", $storedName, 'public');

        $record = $purchaseOrder->files()->create([
            'original_name' => $originalName,
            'stored_name'   => $storedName,
            'path'          => $path,
            'mime_type'     => $file->getMimeType(),
            'size'          => $file->getSize(),
            'description'   => $request->description,
        ]);

        return response()->json($record, 201);
    }

    public function download(PurchaseOrder $purchaseOrder, PurchaseOrderFile $file)
    {
        abort_unless($file->purchase_order_id === $purchaseOrder->id, 404);

        return Storage::disk('public')->download($file->path, $file->original_name);
    }

    public function destroy(PurchaseOrder $purchaseOrder, PurchaseOrderFile $file)
    {
        abort_unless($file->purchase_order_id === $purchaseOrder->id, 404);

        Storage::disk('public')->delete($file->path);
        $file->delete();

        return response()->json(['message' => 'Archivo eliminado']);
    }
}
